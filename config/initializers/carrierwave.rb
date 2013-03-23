CarrierWave.configure do |config|

  config.cache_dir = File.join(Rails.root, 'tmp', 'uploads')
  config.store_dir = 'data'

  case Rails.env.to_sym

  when :production_disabled
    config.storage          = :fog
    config.fog_credentials  = {
      :provider                 => 'AWS',
      :aws_access_key_id        => ENV['S3_ACCESS_KEY'],
      :aws_secret_access_key    => ENV['S3_SECRET'],
      :region                   => 'eu-west-1'
    }
    config.fog_directory    = ENV['S3_BUCKET']

  else
    # settings for the local filesystem
    config.storage = :file
    config.root = File.join(Rails.root, 'public')
  end

end