OpenBudget::Application.routes.draw do

  root :to => 'application#index'
  get 'experiment' => 'application#experiment'

  id = /[\w-]+/
  scope ':id', :constraints => {:id => id} do
    get '' => 'application#index'
    get 'experiment' => 'application#experiment'
  end

  get 'data/:id/:file' => 'application#proxy', :constraints => {:id => id, :file => /(data|cache)/}

end
