class ApplicationController < ActionController::Base
  protect_from_forgery

  def get_id_and_subdomain
    subdomain = request.subdomains.to_a[0]
    id = params[:id] || subdomain
    Rails.logger.info "request budget #{id} subdomain #{subdomain} subdomains #{request.subdomains.to_s} id #{params[:id]}"

    # only allow word chars - no dots and slashes for filepath
    if !id.to_s.match(/^[\w-]+$/)
      raise ActionController::RoutingError.new('Not Found')
    end

    [id, subdomain]
  end

  def load_meta
    @meta = get_budget @id

    if @meta.blank?
      raise ActionController::RoutingError.new('Not Found')
    end
  end

  def index
    @id, @subdomain = get_id_and_subdomain
    if @id.match(/be-asp.*/)
      return experiment
    end

    load_meta

    # automate upload
    # a.store! File.open('public/data/bern-budget2013.json')
  end

  def experiment
    @id, @subdomain = get_id_and_subdomain

    load_meta

    respond_to do |format|
      format.html  { render 'experiment', :layout => 'experiment' }
    end
  end

  def d
    @id, @subdomain = get_id_and_subdomain

    load_meta

    @detail = get_details(@id)[params[:node_id]]

    if @detail.blank?
      raise ActionController::RoutingError.new('Not Found')
    end

    respond_to do |format|
      format.html  { render :layout => false }
    end
  end

  def proxy
    if ['data', 'cache', 'topf-1', 'topf-2'].include? params[:file]
      file = params[:file]
    else
      raise ActionController::RoutingError.new('Not Found')
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

  def get_details id
    Rails.cache.fetch("#{id}/details.json", :expires_in => 5.minutes) do

      uploader = BudgetUploader.new

      uploader.retrieve_from_store! "#{id}/details.json"
      if !uploader.file.exists?
        return nil
      end

      JSON.parse uploader.file.read
    end
  end
end
