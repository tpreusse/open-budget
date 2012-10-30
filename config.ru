use Rack::Static, 
  :urls => ["/stylesheets", "/images", "/scripts", "/lib", "/data", "/favicon.ico"],
  :root => "."

run lambda { |env|
  if env['PATH_INFO'] == '/'
    [
      200, 
      {
        'Content-Type'  => 'text/html', 
        'Cache-Control' => 'public, max-age=86400' 
      },
      File.open('./index.html', File::RDONLY)
    ]
  else
    [
      404,
      {
        'Content-Type'  => 'text/html'
      },
      ['404 Not Found']
    ]
  end
}