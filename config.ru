trap('TERM') do
  puts "received SIGTERM, exiting"
  exit
end

if ENV['RACK_ENV'] == 'production'
  require 'newrelic_rpm'
  NewRelic::Agent.manual_start
end

use Rack::Static, 
  :urls => [
    "/stylesheets", "/images", "/scripts", "/lib", "/data", "/favicon.ico", 
    "/apple-touch-icon.png", "/apple-touch-icon-precomposed.png", 
    "/apple-touch-icon-57x57-precomposed.png", "/apple-touch-icon-72x72-precomposed.png", "/apple-touch-icon-114x114-precomposed.png", "/apple-touch-icon-144x144-precomposed.png"
  ],
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