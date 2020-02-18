<?php
class CFPC_Page_Cache
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
    $this->email = getenv('CF_EMAIL') ? sanitize_email(getenv('CF_EMAIL')) : self::CF_EMAIL;
    $this->api_key = getenv('CF_API_KEY') ? sanitize_key(getenv('CF_API_KEY')) : self::CF_API_KEY;
    $this->account_id = getenv('CF_ACCOUNT_ID') ? sanitize_key(getenv('CF_ACCOUNT_ID')) : self::CF_ACCOUNT_ID;
    $this->namespace_id = getenv('CF_NAMESPACE_ID') ? sanitize_key(getenv('CF_NAMESPACE_ID')) : self::CF_NAMESPACE_ID;

    $this->non_cacheable_urls = self::NON_CACHEABLE_URLS_DEFAULT;
    $non_cacheable_urls_extra = getenv('NON_CACHEABLE_URLS_EXTRA') ? sanitize_text_field(getenv('NON_CACHEABLE_URLS_EXTRA')) : self::NON_CACHEABLE_URLS_EXTRA;
    if ($non_cacheable_urls_extra) {
      $array_urls = explode("|", $non_cacheable_urls_extra);
      foreach ($array_urls as $url) {
        $this->non_cacheable_urls[] = $url;
      }
    }

    $this->bypass_cookies = self::BYPASS_COOKIES_DEFAULT;
    $bypass_cookies_extra = getenv('BYPASS_COOKIES_EXTRA') ? sanitize_text_field(getenv('BYPASS_COOKIES_EXTRA')) : self::BYPASS_COOKIES_EXTRA;
    if ($bypass_cookies_extra) {
      $array_cookies = explode("|", $bypass_cookies_extra);
      foreach ($array_cookies as $cookie) {
        $this->bypass_cookies[] = $cookie;
      }
    }
  }

  public function is_cf_access()
  {
    $is_cf_access = false;
    if ($this->email && $this->api_key && $this->account_id && $this->namespace_id) {
      $is_cf_access = true;
    }
    return $is_cf_access;
  }

  public function get_cache_version()
  {
    $kv_key = self::KV_KEY;
    $cf_kv_value = null;
    $cf_api = $this->get_cf_api();
    if (isset($cf_api)) {
      $cf_kv_value = (int) $cf_api->kv_get_value_by_key($this->namespace_id, $kv_key);
    }
    return $cf_kv_value;
  }

  public function set_cache_version($value)
  {
    $kv_key = self::KV_KEY;
    $cf_api = $this->get_cf_api();

    if (isset($cf_api)) {
      $result = $cf_api->kv_set_value_by_key($this->namespace_id, $kv_key, $value);
    }
    return $result['success'];
  }

  public function get_cf_api()
  {
    $cf_api = null;
    if ($this->is_cf_access()) {
      $cf_api = new CFPC_CF_API($this->email, $this->api_key, $this->account_id);
    }
    return $cf_api;
  }

  public function update_cache_version($is_ajax = false)
  {
    $cf_cache_version = $this->get_cache_version();
    if (isset($cf_cache_version)) {
      if ($cf_cache_version || $cf_cache_version == 0) {
        $cf_cache_version++;
        $is_success = $this->set_cache_version($cf_cache_version);

        $cfpc_preload_cache = new CFPC_PRELOAD_CACHE();
        if ($is_success && $cfpc_preload_cache->is_preload) {
          wp_schedule_single_event(time() + 10, 'cfpc_action_preload_cache_set_urls_single_event');
        }

        if ($is_ajax) {
          wp_send_json_success(esc_attr($is_success));
        }
      }
    }
    if ($is_ajax) {
      wp_die();
    }
  }

  function is_non_cacheable_urls()
  {
    $requestURI = sanitize_text_field($_SERVER['REQUEST_URI']);
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
    // Term
    add_action('edit_term', array($this, 'action_update_cache_version_3'), 0, 3);
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

  function action_update_cache_version_3($id, $item, $update)
  {
    if ($update) {
      $this->action_update_cache_version();
    }
  }
}
