<?php
class CfPageCache
{

	const KV_KEY = "html_cache_version";
	const BYPASS_COOKIES = "wordpress_logged_in_|comment_|woocommerce_";
	const NON_CACHEABLE_PAGES = array("/wp-", "/tours", "/dist/", "/redirector/", "/go/");
	const X_HTML_EDGE_CACHE = "x-HTML-Edge-Cache";

	public function __construct()
	{ }

	public function update_cache_version($is_ajax = false)
	{

		$cf_email = getenv('CF_EMAIL') ? getenv('CF_EMAIL') : "";
		$cf_api_key = getenv('CF_API_KEY') ? getenv('CF_API_KEY') : "";
		$cf_account_id = getenv('CF_ACCOUNT_ID') ? getenv('CF_ACCOUNT_ID') : "";
		$cf_namespace_id = getenv('CF_NAMESPACE_ID') ? getenv('CF_NAMESPACE_ID') : "";

		$kv_key = self::KV_KEY;

		if ($cf_email && $cf_api_key && $cf_account_id && $cf_namespace_id && $kv_key) {
			$cf_api = new CfAPI($cf_email, $cf_api_key, $cf_account_id);
			$cf_kv_value = $cf_api->kv_get_value_by_key($cf_namespace_id, $kv_key);
			if ($cf_kv_value || $cf_kv_value == 0) {
				$cf_kv_value++;
				$result = $cf_api->kv_set_value_by_key($cf_namespace_id, $kv_key, $cf_kv_value);
				if ($is_ajax) {
					wp_send_json_success($result['success']);
				}
			}
		}
		if ($is_ajax) {
			wp_die();
		}
	}

	static function is_non_cacheable_pages()
	{
		$requestURI = $_SERVER['REQUEST_URI'];
		foreach (self::NON_CACHEABLE_PAGES as $page) {
			if (strpos($requestURI, $page) === 0) {
				return true;
			}
		}
		return false;
	}

	// Callbacks that something changed
	function set_html_edge_cache_header()
	{
		// Add the edge-cache headers
		if (!is_user_logged_in() && !self::is_non_cacheable_pages()) {
			header(self::X_HTML_EDGE_CACHE . ': cache,bypass-cookies=' . self::BYPASS_COOKIES);
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
