source 'https://rubygems.org'

gem 'rails', '3.2.12'

gem 'carrierwave'
gem 'fog', '~> 1.3.1'
gem 'memcachier'
gem 'dalli'

gem 'jquery-rails'
gem 'haml-rails', '>= 0.4'

# Gems used only for assets and not required
# in production environments by default.
group :assets do
  gem 'sass-rails',   '~> 3.2.3'
  gem 'zurb-foundation'
end

# For people who want to develop without a js runtime
group :js do
  # See https://github.com/sstephenson/execjs#readme for more supported runtimes
  # gem 'therubyracer', :platforms => :ruby
  gem 'uglifier', '>= 1.0.3'
end

# ToDo: Test unicorn on heroku
# gem 'unicorn', '>= 4.3.1'
gem 'thin', '>= 1.5.0'#, :group => [:development, :test]
