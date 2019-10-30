<?php
/*
Plugin Name:  Page Cache on Cloudflare
Plugin URI:   https://github.com/palessit/cloudflare-cache-page/tree/master/page-cache-on-cloudflare-wp-plugin
Description:  The fastest cache HTML pages on the Cloudflare with purge by button and automatic. You can specify URLs and cookies to exclude caching.
Version:      1.0.0
Author:       DzmitryAd, alkononovich
Author URI:   https://palessit.com
License:      GPLv2 or later
License URI:  License URI:  http://www.gnu.org/licenses/gpl-2.0.html
*/

// If this file is called directly, abort.
if (!defined('WPINC')) {
  die;
}

defined('ABSPATH') or die('No script kiddies please!');
define('CFPC_CACHE_PAGE_DIR', plugin_dir_path(__FILE__));

foreach (glob(CFPC_CACHE_PAGE_DIR . 'inc/*.php') as $file) {
  include_once $file;
}

add_action('plugins_loaded', 'cfpc_admin_settings');
function cfpc_admin_settings()
{
  $cfpc_admin_toolbar = new CFPC_Admin_Toolbar();
  $cfpc_admin_toolbar->add();
}

add_action('init', 'cfpc_set_html_edge_cache_header');
function cfpc_set_html_edge_cache_header()
{
  $cf_page_cache = new CFPC_Page_Cache();
  $cf_page_cache->set_html_edge_cache_header();
}

add_action('init', 'cfpc_add_update_cache_version_actions');
function cfpc_add_update_cache_version_actions()
{
  $cf_page_cache = new CFPC_Page_Cache();
  $cf_page_cache->add_update_cache_version_actions();
}
