<?php

class CFPC_CF_API
{
  const CONTENT_TYPE_KEY = 'Content-Type';
  public const APPLICATION_JSON_KEY = 'application/json';
  const ENDPOINT = 'https://api.cloudflare.com/client/v4/';
  const X_AUTH_KEY = 'X-Auth-Key';
  const X_AUTH_EMAIL = 'X-Auth-Email';

  private $auth_email;
  private $auth_api_key;
  private $account_id;


  public function __construct($email, $api_key, $account_id)
  {
    $this->auth_email = $email;
    $this->auth_api_key = $api_key;
    $this->account_id = $account_id;
  }

  function kv_get_value_by_key($namespace_id, $key)
  {
    $url = self::ENDPOINT . 'accounts/' . $this->account_id . '/storage/kv/namespaces/' . $namespace_id . '/values/' . $key;
    $result = $this->send_request('GET', $url);
    return $result;
  }

  function kv_set_value_by_key($namespace_id, $key, $value)
  {
    $url = self::ENDPOINT . 'accounts/' . $this->account_id . '/storage/kv/namespaces/' . $namespace_id . '/values/' . $key;
    $result = $this->send_request('PUT', $url, $value);
    return $result;
  }

  public function send_request($method, $url, $body = "")
  {
    $headers = array(
      self::CONTENT_TYPE_KEY => self::APPLICATION_JSON_KEY,
    );
    $headers[self::X_AUTH_EMAIL] = $this->auth_email;
    $headers[self::X_AUTH_KEY] = $this->auth_api_key;

    $requestParams = array();
    $requestParams['method'] = $method;
    $requestParams['headers'] = $headers;

    if ($requestParams['method'] !== 'GET') {
      $requestParams['body'] = json_encode($body);
    }

    // Send Request
    $requestResponse = wp_remote_request($url, $requestParams);

    // Check for connection error
    if (is_wp_error($requestResponse)) {
      $errorMessage = $requestResponse->get_error_message();
      $this->create_log_error($errorMessage);
    }

    // Check for response error != 2XX
    if (wp_remote_retrieve_response_code($requestResponse) > 299) {
      $errorMessage = wp_remote_retrieve_response_message($requestResponse);
      $this->create_log_error($errorMessage);
    }

    // Decode request to JSON
    $response = json_decode(wp_remote_retrieve_body($requestResponse), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
      $errorMessage = 'Error decoding client API JSON';
      $this->create_log_error($errorMessage);
    }

    return $response;
  }

  function create_log_error($msg)
  {
    $date = date('d.m.Y h:i:s');
    $log = "Date:  " . $date . " | Cloudflare page cache| " . $msg . "\n";
    error_log($log);
  }
}
