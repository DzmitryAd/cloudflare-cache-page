<?php
/*
Plugin Name:  Page Cache on Cloudflare
Plugin URI:   https://github.com/palessit/cloudflare-cache-page/tree/master/page-cache-on-cloudflare-wp-plugin
Description:  The fastest cache HTML pages on the Cloudflare with purge by button and automatic. You can specify URLs and cookies to exclude caching.
Version:      1.2.0
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

add_action('cfpc_action_preload_cache_event',  'cfpc_preload_cache_event');

function cfpc_preload_cache_event()
{
  $cfpc_preload_cache = new CFPC_PRELOAD_CACHE();
  $cfpc_preload_cache->preload_cache_event();
}

register_activation_hook(__FILE__, 'cfpc_activate_plugin');

function cfpc_activate_plugin()
{
  $cfpc_preload_cache = new CFPC_PRELOAD_CACHE();
  if ($cfpc_preload_cache->is_preload) {
    wp_schedule_event(time(), 'everyminute', 'cfpc_action_preload_cache_event');
  }
}

register_deactivation_hook(__FILE__, 'cfpc_deactivate_plugin');

function cfpc_deactivate_plugin()
{
  wp_clear_scheduled_hook('cfpc_action_preload_cache_event');
}

add_action('cfpc_action_preload_cache_set_urls_single_event', 'cfpc_preload_cache_set_urls_single_event');

function cfpc_preload_cache_set_urls_single_event()
{
  $cfpc_preload_cache = new CFPC_PRELOAD_CACHE();
  $cfpc_preload_cache->preload_cache_set_urls_single_event();
}

add_filter('cron_schedules', 'cfpc_add_crob_schedule_interval_minute');

function cfpc_add_crob_schedule_interval_minute($schedules)
{
  $schedules['everyminute'] = array(
    'interval' => 60,
    'display' => 'Once Every 1 Minute'
  );
  return $schedules;
}
