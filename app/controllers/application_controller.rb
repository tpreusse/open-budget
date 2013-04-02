class ApplicationController < ActionController::Base
  protect_from_forgery

  def index
    @subdomain = request.subdomains.to_a[0]
    id = params[:id] || @subdomain
    Rails.logger.info "request budget #{id} subdomain #{@subdomain} subdomains #{request.subdomains.to_s} id #{params[:id]}"

    # only allow word chars - no dots and slashes for filepath
    if !id.to_s.match(/^[\w-]+$/)
      raise ActionController::RoutingError.new('Not Found')
    end

    @meta = get_budget id

    if @meta.blank?
      raise ActionController::RoutingError.new('Not Found')
    end

    # automate upload
    # a.store! File.open('public/data/bern-budget2013.json')
  end

  def proxy
    file = if params[:file] == 'data'
      'data'
    else
      'cache'
    end
    id = params[:id]
    # only allow word chars - no dots and slashes for filepath
    if !id.to_s.match(/^[\w-]+$/)
      raise ActionController::RoutingError.new('Not Found')
    end

    uploader = BudgetUploader.new
    uploader.retrieve_from_store! "#{id}/#{file}.json"
    if !uploader.file.exists?
      raise ActionController::RoutingError.new('Not Found')
    end

    respond_to do |format|
      format.json  { render :text => uploader.file.read }
    end
  end

  def get_budget id
    Rails.cache.fetch("#{id}/meta.json", :expires_in => 5.minutes) do

      uploader = BudgetUploader.new

      uploader.retrieve_from_store! "#{id}/meta.json"
      if !uploader.file.exists?
        return nil
      end

      JSON.parse uploader.file.read
    end
  end
end
