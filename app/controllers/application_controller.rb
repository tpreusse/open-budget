class ApplicationController < ActionController::Base
  protect_from_forgery

  def index
    id = params[:id] || request.subdomains[0]
    Rails.logger.info "request budget #{id} subdomain #{request.subdomains.to_s} id #{params[:id]}"

    # only allow word chars - no dots and slashes for filepath
    if !id.match(/^[\w-]+$/)
      raise ActionController::RoutingError.new('Not Found')
    end

    @data = get_budget id

    if @data.blank?
      raise ActionController::RoutingError.new('Not Found')
    end

    # automate upload
    # a.store! File.open('public/data/bern-budget2013.json')
  end

  def get_budget id
    Rails.cache.fetch("#{id}/data.json", :expires_in => 5.minutes) do

      uploader = BudgetUploader.new

      uploader.retrieve_from_store! "#{id}/data.json"
      if !uploader.file.exists?
        return nil
      end

      source = JSON.parse uploader.file.read

      budget = {}
      data = {
        meta: source['meta']
      }
      if source['cache']
        data['nodes'] = source['cache']
        budget['usePreproccesedData'] = true
        budget['preproccesedData'] = data
      else
        data['nodes'] = source['data']
        budget['data'] = data
      end

      {
        'meta' => source['meta'],
        'json' => budget.to_json
      }
    end
  end
end
