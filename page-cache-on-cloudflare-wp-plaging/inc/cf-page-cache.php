<?php
class CfPageCache
{

  const KV_KEY = "html_cache_version";
  const X_HTML_EDGE_CACHE = "x-HTML-Edge-Cache";
  const BYPASS_COOKIES_DEFAULT = array("wordpress_logged_in_", "comment_", "woocommerce_");
  const NON_CACHEABLE_URLS_DEFAULT = array("/wp-");
  const CF_EMAIL = "";
  const CF_API_KEY = "";
  const CF_ACCOUNT_ID = "";
  const CF_NAMESPACE_ID = "";
  const BYPASS_COOKIES_EXTRA = ""; // eg "wp-|wordpress"
  const NON_CACHEABLE_URLS_EXTRA = ""; // eg "/dist/|/redirector/|/go/|/tours"

  public $email, $api_key, $account_id, $namespace_id;
  public $non_cacheable_urls, $bypass_cookies;

  public function __construct()
  {
    $this->email = getenv('CF_EMAIL') ? getenv('CF_EMAIL') : self::CF_EMAIL;
    $this->api_key = getenv('CF_API_KEY') ? getenv('CF_API_KEY') : self::CF_API_KEY;
    $this->account_id = getenv('CF_ACCOUNT_ID') ? getenv('CF_ACCOUNT_ID') : self::CF_ACCOUNT_ID;
    $this->namespace_id = getenv('CF_NAMESPACE_ID') ? getenv('CF_NAMESPACE_ID') : self::CF_NAMESPACE_ID;

    $this->non_cacheable_urls = self::NON_CACHEABLE_URLS_DEFAULT;
    $non_cacheable_urls_extra = getenv('NON_CACHEABLE_URLS_EXTRA') ? getenv('NON_CACHEABLE_URLS_EXTRA') : self::NON_CACHEABLE_URLS_EXTRA;
    if ($non_cacheable_urls_extra) {
      $array_urls = explode("|", $non_cacheable_urls_extra);
      foreach ($array_urls as $url) {
        $this->non_cacheable_urls[] = $url;
      }
    }

    $this->bypass_cookies = self::BYPASS_COOKIES_DEFAULT;
    $bypass_cookies_extra = getenv('BYPASS_COOKIES_EXTRA') ? getenv('BYPASS_COOKIES_EXTRA') : self::BYPASS_COOKIES_EXTRA;
    if ($bypass_cookies_extra) {
      $array_cookies = explode("|", $bypass_cookies_extra);
      foreach ($array_cookies as $cookie) {
        $this->bypass_cookies[] = $cookie;
      }
    }
  }

  public function update_cache_version($is_ajax = false)
  {
    $kv_key = self::KV_KEY;

    if ($this->email && $this->api_key && $this->account_id && $this->namespace_id && $kv_key) {
      $cf_api = new CfAPI($this->email, $this->api_key, $this->account_id);
      $cf_kv_value = $cf_api->kv_get_value_by_key($this->namespace_id, $kv_key);
      if ($cf_kv_value || $cf_kv_value == 0) {
        $cf_kv_value++;
        $result = $cf_api->kv_set_value_by_key($this->namespace_id, $kv_key, $cf_kv_value);
        if ($is_ajax) {
          wp_send_json_success($result['success']);
        }
      }
    }
    if ($is_ajax) {
      wp_die();
    }
  }

  function is_non_cacheable_urls()
  {
    $requestURI = $_SERVER['REQUEST_URI'];
    foreach ($this->non_cacheable_urls as $url) {
      if (strpos($requestURI, $url) === 0) {
        return true;
      }
    }
    return false;
  }

  // Callbacks that something changed
  function set_html_edge_cache_header()
  {
    // Add the edge-cache headers
    if (!is_user_logged_in() && !$this->is_non_cacheable_urls()) {
      $bypass_cookies = implode("|", $this->bypass_cookies);
      header(self::X_HTML_EDGE_CACHE . ': cache,bypass-cookies=' . $bypass_cookies);
    } else {
      header(self::X_HTML_EDGE_CACHE . ': nocache');
    }
  }

  public function add_update_cache_version_actions()
  {
    // Post ID is received
    add_action('save_post', array($this, 'action_update_cache_version_3'), 0, 3);
    add_action('publish_phone', array($this, 'action_update_cache_version'), 0);
    // Coment ID is received
    add_action('trackback_post', array($this, 'action_update_cache_version'), 99);
    add_action('pingback_post', array($this, 'action_update_cache_version'), 99);
    add_action('comment_post', array($this, 'action_update_cache_version'), 99);
    add_action('edit_comment', array($this, 'action_update_cache_version'), 99);
    add_action('wp_set_comment_status', array($this, 'action_update_cache_version'), 99);
    // No post_id is available
    add_action('switch_theme', array($this, 'action_update_cache_version'), 99);
    add_action('edit_user_profile_update', array($this, 'action_update_cache_version'), 99);
    add_action('wp_update_nav_menu', array($this, 'action_update_cache_version'));
  }

  // Add the response header to purge the cache. send_headers isn't always called
  // so set it immediately when something changes.
  function action_update_cache_version()
  {
    header(self::X_HTML_EDGE_CACHE . ': purgeall');
  }

  function action_update_cache_version_3($post_ID, $post, $update)
  {
    if ($update) {
      $this->action_update_cache_version();
    }
  }
}
