New developers, designers and ideator are welcomed to join.

## Amateur: How to use
* stay tuned for cloud hosted solution

## Engineer: How to use
### Prerequisites
* ruby 1.9.3
* RubyGems
* Bundler

### We recommend RVM
* [see install documentation](https://rvm.io/rvm/install/)
* recommended params: `curl -#L https://get.rvm.io | bash -s stable --autolibs=3 --ruby=1.9.3`
* make sure to load rvm into your shell sessions: [RVM is not found...](https://rvm.io/support/faq/)

### No JS runtime installed?
* `bundle config --local without js`
* or use `therubyracer` but I haven't had time to test it

### Starte the server
* `bundle install` (needs to run everytime Gemfile changes)
* `rails s thin`
* create your own data file in the format of public/data/bern/data.json
* send pull request with cool stuff

## Documentation
* [Wiki](https://github.com/tpreusse/open-budget/wiki)
* [Data Format](https://github.com/tpreusse/open-budget/wiki/Data-Format)
