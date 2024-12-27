# customize.vitepress

Allows the generation of a static site via [Vitepress](https://vitepress.dev/). It is meant to allow RecordM to act as a Content Management System. 

This customization splits content, structure and styling. The necessary definitions can be found in `/others/customize.vitepress/definition/`. The basic idea is that `Contents` are atomic and are structured via `Site Pages`. The aspect they have on the generated page is dependent on the `Layouts`. Layouts have a mapping to a vue component which is applied to them. 

# Setup

After installing the customization, you need to install a theme with it. A theme is a [vitepress theme](https://vitepress.dev/guide/custom-theme). 

Two files must be added to this customization for it to work.
1. In the directory `others/vitepress/.vitepress` you must add a `configure.js` file which exports a `configure` function, that takes a `baseConfig` argument. It should return an instance of [`SiteConfig`](https://vitepress.dev/reference/site-config) from vitepress. This is where config-related customizations are added.
2. In the directroy `others/vitepress/.vitepress/theme` you must add a `theme-init.ts`. The default export of which should be the [`Theme`](https://vitepress.dev/guide/custom-theme#theme-interface) object to use by vitepress. It should also export a function called `enhance` which receives an object argument `{app, router, site}`, this function is the [`enhanceApp`]((https://vitepress.dev/guide/custom-theme#theme-interface)) function called by vitepress. 

These files serve as a connection point between the vitepress generator and the theme itself. The theme can depend on files from the generator, such as the markdown component of the `auth.ts` utils. 

If you wish to use the backend scripts that connect to the pipeline:
- Create a `GitlabVitepressConfig` class in `/integrationm/common/vitepress` as per the example in `/others/vitepress/example`
- Update the pipeline for your server. The pipeline expects a user and a series of tokens. The user must exist on the server and the tokens should be configured at the level of the project. 
```yaml
stages:
  - build
  - deploy

cache:
  paths:
    - others/vuepress/node_modules/

build:
  stage: build
  rules:
    - if: $CI_PIPELINE_SOURCE == 'trigger' && $ENV == 'prod' && $STAGE_OR_PROD == 'STAGE'
      when: always
      variables:
        SERVER: <SERVER>
        TOKEN: <TOKEN_PROD>
        COB_TAG: $TAG 
        BASE: <BASE_STAGE>
    - if: $CI_PIPELINE_SOURCE == 'trigger' && $ENV == 'qual' && $STAGE_OR_PROD == 'STAGE'
      when: always
      variables:
        SERVER: <SERVER_QUAL>
        TOKEN: <TOKEN_QUAL>
        COB_TAG: $TAG 
        BASE: <BASE_STAGE>
    - if: $CI_PIPELINE_SOURCE == 'trigger' && $ENV == 'prod' &&  $STAGE_OR_PROD == 'PROD'
      when: always
      variables:
        SERVER: <SERVER>
        TOKEN: <TOKEN_PROD>
        COB_TAG: $DIR_NAME
        BASE: <BASE_PROD>
    - if: $CI_PIPELINE_SOURCE == 'trigger' && $ENV == 'qual' && $STAGE_OR_PROD == 'PROD'
      when: always
      variables:
        SERVER: <SERVER_QUAl>
        TOKEN: <TOKEN_QUAL>
        COB_TAG: $DIR_NAME
        BASE: <BASE_PROD>
  cache:
    paths:
      - others/vuepress/node_modules/
  when: manual
  image: node:22
  artifacts:
    paths:
      - "others/vitepress/.vitepress/dist/"
    untracked: true 
    when: on_success
    access: all
    expire_in: 30 days
  script:
    - cd others/vitepress
    - curl https://$SERVER.cultofbits.com/integrationm/concurrent/_lrn_update_deploy -b "cobtoken=$TOKEN" -d "tag=$COB_TAG&state=Installing dependencies" -v 
    - npm install
    - curl https://$SERVER.cultofbits.com/integrationm/concurrent/_lrn_update_deploy -b "cobtoken=$TOKEN" -d "tag=$COB_TAG&state=Building..." -v 
    - SERVER=https://$SERVER.cultofbits.com/ TOKEN="$TOKEN" DOMAIN=<SITE> BASE=$BASE npm run build
    - curl https://$SERVER.cultofbits.com/integrationm/concurrent/_lrn_update_deploy -b "cobtoken=$TOKEN" -d "tag=$COB_TAG&state=Preparing Deploy environment" -v  

deploy:
  stage: deploy 
  rules:
   - if: $CI_PIPELINE_SOURCE == 'trigger' && $ENV == 'prod' && $STAGE_OR_PROD == 'STAGE'
      when: always
      variables:
        SERVER: <SERVER>
        TOKEN: <TOKEN_PROD>
        COB_TAG: $TAG 
        BASE: <BASE_STAGE>
    - if: $CI_PIPELINE_SOURCE == 'trigger' && $ENV == 'qual' && $STAGE_OR_PROD == 'STAGE'
      when: always
      variables:
        SERVER: <SERVER_QUAL>
        TOKEN: <TOKEN_QUAL>
        COB_TAG: $TAG 
        BASE: <BASE_STAGE>
    - if: $CI_PIPELINE_SOURCE == 'trigger' && $ENV == 'prod' &&  $STAGE_OR_PROD == 'PROD'
      when: always
      variables:
        SERVER: <SERVER>
        TOKEN: <TOKEN_PROD>
        COB_TAG: $DIR_NAME
        BASE: <BASE_PROD>
    - if: $CI_PIPELINE_SOURCE == 'trigger' && $ENV == 'qual' && $STAGE_OR_PROD == 'PROD'
      when: always
      variables:
        SERVER: <SERVER_QUAl>
        TOKEN: <TOKEN_QUAL>
        COB_TAG: $DIR_NAME
        BASE: <BASE_PROD>
  needs:
    - build
  before_script:
    - apk add --no-cache rsync openssh curl
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | base64 -d | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - echo "$SERVER.cultofbits.com" >> ~/.ssh/known_hosts 
  image: alpine
  script:
    - curl https://$SERVER.cultofbits.com/integrationm/concurrent/_lrn_update_deploy -b "cobtoken=$TOKEN" -d "tag=$COB_TAG&state=Deploying.." -v 
    - ssh -p 40022 -o StrictHostKeyChecking=no <USER>@$SERVER.cultofbits.com "mkdir -p ~/$BASE"
    - rsync -e "ssh -o StrictHostKeyChecking=no -p 40022" others/vitepress/.vitepress/dist/ <USER>@$SERVER.cultofbits.com:$BASE/$DIR -aci --delete
    - curl https://$SERVER.cultofbits.com/integrationm/concurrent/_lrn_update_deploy -b "cobtoken=$TOKEN" -d "tag=$COB_TAG&state=Deployed" -v 
```
