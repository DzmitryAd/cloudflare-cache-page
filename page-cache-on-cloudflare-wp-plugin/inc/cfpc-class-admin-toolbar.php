<?php
class CFPC_Admin_Toolbar
{
  public function __construct()
  {
    add_action('wp_ajax_cfpc_update_cache_version', array($this, "update_cache_version_toolbar"));
  }

  public function update_cache_version_toolbar()
  {
    $is_ajax = isset($_POST['is_ajax']) ? (bool) sanitize_text_field($_POST['is_ajax']) : false;
    $cf_page_cache = new CFPC_Page_Cache();
    $cf_page_cache->update_cache_version($is_ajax);
  }

  public function add()
  {
    if (is_admin()) {
      add_action('wp_before_admin_bar_render', array($this, 'cfpc_tweaked_toolbar_on_admin_panel'));
      add_action('admin_enqueue_scripts', array($this, 'load_toolbar_js'));
      add_action('admin_enqueue_scripts', array($this, 'load_toolbar_css'));
    } else {
      if (is_admin_bar_showing()) {
        add_action('wp_before_admin_bar_render', array($this, 'cfpc_tweaked_toolbar_on_frontpage'));
        add_action('wp_enqueue_scripts', array($this, 'load_toolbar_js'));
        add_action('wp_enqueue_scripts', array($this, 'load_toolbar_css'));
      }
    }
  }

  public function load_toolbar_js()
  {
    wp_enqueue_script("cfpc-toolbar", plugins_url("inc/toolbar.js", dirname(__FILE__)), array(), time(), true);
  }

  public function load_toolbar_css()
  {
    wp_enqueue_style("cfpc-toolbar", plugins_url("inc/toolbar.css", dirname(__FILE__)), array(), time(), "all");
  }

  public function cfpc_tweaked_toolbar_on_frontpage()
  {
    global $wp_admin_bar;

    $wp_admin_bar->add_menu(array(
      'id'    => 'cfpc-update-cache-version',
      'title' => 'CF Update Cache Version',
      'meta' => array("class" => "cfpc-toolbar")
    ));
  }

  public function cfpc_tweaked_toolbar_on_admin_panel()
  {
    global $wp_admin_bar;

    $wp_admin_bar->add_menu(array(
      'id'    => 'cfpc-update-cache-version',
      'title' => 'CF Update Cache Version',
      'meta' => array("class" => "cfpc-toolbar")
    ));
  }
}
