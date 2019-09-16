<?php
/*
 * Plugin Name: Cloudflare Page Cache by Palessit
 * Description: Cache HTML pages on the Cloudflare CDN when used with the page cache Worker.
 * Version: 1.0.0
 * Author: Palessit
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
  die;
}

defined('ABSPATH') or die('No script kiddies please!');
define('CF_CACHE_PAGE_DIR', plugin_dir_path(__FILE__));

foreach (glob(CF_CACHE_PAGE_DIR . 'inc/*.php') as $file) {
  include_once $file;
}

add_action('plugins_loaded', 'cf_page_cache_admin_settings');
function cf_page_cache_admin_settings()
{
  $cfpc_admin_toolbar = new CfPageCacheAdminToolbar();
  $cfpc_admin_toolbar->add();
}

add_action('init', 'cf_set_html_edge_cache_header');
function cf_set_html_edge_cache_header()
{
  $cf_page_cache = new CfPageCache();
  $cf_page_cache->set_html_edge_cache_header();
}

add_action('init', 'cf_add_update_cache_version_actions');
function cf_add_update_cache_version_actions()
{
  $cf_page_cache = new CfPageCache();
  $cf_page_cache->add_update_cache_version_actions();
}
