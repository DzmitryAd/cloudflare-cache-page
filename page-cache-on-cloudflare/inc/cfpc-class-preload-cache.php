<?php

class CFPC_PRELOAD_CACHE
{
  const CF_IS_PRELOAD_CACHE = true;
  const CF_PRELOAD_CACHE_PAGE_PER_MINUTE = 50;
  const PRELOAD_CACHE = "preload_cache";
  const USER_AGENT = "Cloudflare Page Cache Plugin Preload Bot";
  const TIMEOUT = 10;
  const DEBUG = false;

  public $is_preload, $page_per_minute, $cf_page_cache;

  public function __construct()
  {
    $this->is_preload = getenv('CF_IS_PRELOAD_CACHE') ? sanitize_key(getenv('CF_IS_PRELOAD_CACHE')) : self::CF_IS_PRELOAD_CACHE;
    $this->page_per_minute = getenv('CF_PRELOAD_CACHE_PAGE_PER_MINUTE') ? sanitize_key(getenv('CF_PRELOAD_CACHE_PAGE_PER_MINUTE')) : self::CF_PRELOAD_CACHE_PAGE_PER_MINUTE;
    $this->cf_page_cache = new CFPC_Page_Cache();
  }

  function create_log_error($msg)
  {
    $date = date('d.m.Y h:i:s');
    $log = "Date:  " . $date . " | Cloudflare page cache | Preload cache | " . $msg . "\n";
    error_log($log);
  }

  function remote_get($url)
  {
    $response = wp_remote_get($url, array('headers' => array("accept" => 'text/html'), 'user-agent' => self::USER_AGENT, 'timeout' => self::TIMEOUT, 'sslverify' => false));

    if (self::DEBUG) {
      $this->create_log_error(json_encode($response['headers']->getAll()) . ', url: ' . $url);
    }

    if (!$response || is_wp_error($response)) {
      $this->create_log_error($response->get_error_message() . " - ");
      return false;
    } else {
      if (wp_remote_retrieve_response_code($response) != 200) {
        return false;
      }
    }

    return true;
  }

  function preload_cache_event()
  {
    $cf_cache_version = $this->cf_page_cache->get_cache_version();
    if (isset($cf_cache_version)) {
      $cf_api = $this->cf_page_cache->get_cf_api();
      $kv_preload_cache = $cf_api->kv_get_value_by_key($this->cf_page_cache->namespace_id, self::PRELOAD_CACHE);
      if (isset($kv_preload_cache)) {
        $preload_cache = json_decode($kv_preload_cache, true);
        if (
          isset($preload_cache['version'])
          && $preload_cache['version'] == $cf_cache_version
          && isset($preload_cache['length'])
          && isset($preload_cache['offset'])
          && $preload_cache['length'] > 0
          && $preload_cache['offset'] < $preload_cache['length']
        ) {
          $offset = $preload_cache['offset'];
          $length = $preload_cache['length'];
          $count = $preload_cache['count'];
          $error_urls = $preload_cache['error_urls'];
          $urls = array_slice($preload_cache['urls'], $offset, $this->page_per_minute);

          foreach ($urls as $url) {
            if (!$this->remote_get($url)) {
              $error_urls[] = $url;
            }
            $offset++;
          }

          if ($offset == $length) {
            $preload_cache['date_end'] = date('Y-m-d H:i:s', time());
            $preload_cache['date_latest'] = '';
          } else {
            $preload_cache['date_latest'] = date('Y-m-d H:i:s', time());
          }

          $preload_cache['offset'] = $offset;
          $count++;
          $preload_cache['count'] = $count;
          $preload_cache['length_error_urls'] = count($error_urls);
          $preload_cache['error_urls'] = $error_urls;

          $new_preload_cache_encode = json_encode($preload_cache);
          $result = $cf_api->kv_set_value_by_key($this->cf_page_cache->namespace_id, self::PRELOAD_CACHE, $new_preload_cache_encode);
          if (!$result['success']) {
            $this->create_log_error("KV " . self::PRELOAD_CACHE . " could not be written");
          }
        }
      }
    }
  }

  function preload_cache_set_urls_single_event()
  {
    $cf_api = $this->cf_page_cache->get_cf_api();
    $cf_cache_version = $this->cf_page_cache->get_cache_version();
    if (isset($cf_cache_version)) {
      $urls = $this->get_preload_cache_urls();
      $new_preload_cache = [
        'date_start' => date('Y-m-d H:i:s', time()),
        'date_latest' => '',
        'date_end' => '',
        'count' => 0,
        'version' => $cf_cache_version,
        'length' => count($urls),
        'offset' => 0,
        'urls' => $urls,
        'length_error_urls' => 0,
        'error_urls' => [],
      ];
      $new_preload_cache_encode = json_encode($new_preload_cache);
      $result = $cf_api->kv_set_value_by_key($this->cf_page_cache->namespace_id, self::PRELOAD_CACHE, $new_preload_cache_encode);
      if (!$result['success']) {
        $this->create_log_error("KV " . self::PRELOAD_CACHE . " could not be written");
      }
    }
  }

  function get_preload_cache_urls()
  {
    global $wpdb;
    $urls = array();

    if (!$this->is_preload) {
      return $urls;
    }

    // HOME
    array_push($urls, get_option("home"));

    // CUSTOM POSTS
    $post_types = get_post_types(array('public' => true), "names", "and");
    $where_query = "";

    foreach ($post_types as $post_type_key => $post_type_value) {
      if (!in_array($post_type_key, array("post", "page", "attachment"))) {
        $where_query = $where_query . $wpdb->prefix . "posts.post_type = '" . $post_type_value . "' OR ";
      }
    }

    if ($where_query) {
      $where_query = preg_replace("/(\s*OR\s*)$/", "", $where_query);

      $recent_custom_posts = $wpdb->get_results("SELECT SQL_CALC_FOUND_ROWS  " . $wpdb->prefix . "posts.ID FROM " . $wpdb->prefix . "posts  WHERE 1=1  AND (" . $where_query . ") AND ((" . $wpdb->prefix . "posts.post_status = 'publish'))  ORDER BY " . $wpdb->prefix . "posts.ID DESC ", ARRAY_A);

      if (count($recent_custom_posts) > 0) {
        foreach ($recent_custom_posts as $key => $post) {
          array_push($urls, get_permalink($post["ID"]));
        }
      }
    }

    // POST
    $recent_posts = $wpdb->get_results("SELECT SQL_CALC_FOUND_ROWS  " . $wpdb->prefix . "posts.ID FROM " . $wpdb->prefix . "posts  WHERE 1=1  AND (" . $wpdb->prefix . "posts.post_type = 'post') AND ((" . $wpdb->prefix . "posts.post_status = 'publish'))  ORDER BY " . $wpdb->prefix . "posts.ID DESC", ARRAY_A);

    if (count($recent_posts) > 0) {
      foreach ($recent_posts as $key => $post) {
        array_push($urls, get_permalink($post["ID"]));
      }
    }

    // PAGE
    $pages = get_pages(array(
      'sort_order' => 'DESC',
      'sort_column' => 'ID',
      'parent' => -1,
      'hierarchical' => 0,
      'post_type' => 'page',
      'post_status' => 'publish'
    ));

    if (count($pages) > 0) {
      foreach ($pages as $key => $page) {
        array_push($urls, get_page_link($page->ID));
      }
    }

    // CATEGORY
    $categories = get_terms(array(
      'taxonomy'          => array('category'),
      'orderby'           => 'id',
      'order'             => 'ASC',
      'hide_empty'        => false,
      'fields'            => 'all',
      'pad_counts'        => false,
    ));

    if (count($categories) > 0) {
      foreach ($categories as $key => $category) {
        array_push($urls, get_term_link($category->slug, $category->taxonomy));
      }
    }

    // TAG
    $tags = get_terms(array(
      'taxonomy'          => array('post_tag'),
      'orderby'           => 'id',
      'order'             => 'ASC',
      'hide_empty'        => false,
      'fields'            => 'all',
      'pad_counts'        => false,
    ));

    if (count($tags) > 0) {
      foreach ($tags as $key => $tag) {
        array_push($urls, get_term_link($tag->slug, $tag->taxonomy));
      }
    }

    // Custom Taxonomies
    $taxo = get_taxonomies(array('public'   => true, '_builtin' => false), "names", "and");

    if (count($taxo) > 0) {
      $custom_taxos = get_terms(array(
        'taxonomy'          => array_values($taxo),
        'orderby'           => 'id',
        'order'             => 'ASC',
        'hide_empty'        => false,
        'fields'            => 'all',
        'pad_counts'        => false,
      ));

      if (count($custom_taxos) > 0) {
        foreach ($custom_taxos as $key => $custom_tax) {
          array_push($urls, get_term_link($custom_tax->slug, $custom_tax->taxonomy));
        }
      }
    }

    return $urls;
  }
}
