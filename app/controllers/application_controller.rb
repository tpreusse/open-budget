class ApplicationController < ActionController::Base
  protect_from_forgery

  def index
    id = params[:id] || request.subdomain
    if id.blank?
      id = 'bern'
    end
    Rails.logger.info "request budget #{id}"

    # only allow word chars - no dots and slashes for filepath
    if !id.match(/^[\w-]+$/)
      raise ActionController::RoutingError.new('Not Found')
    end

    uploader = BudgetUploader.new

    uploader.retrieve_from_store! "#{id}/data.json"
    if !uploader.file.exists?
      raise ActionController::RoutingError.new('Not Found')
    end
    @data = JSON.parse uploader.file.read

    # automate upload
    # a.store! File.open('public/data/bern-budget2013.json')
  end
end
