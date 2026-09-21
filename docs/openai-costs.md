# OpenAI costs and complimentary tokens

Spoonspin defaults to GPT-4.1 nano for restaurant text/menu/scores extraction,
photo-search wording, and drink/shop/order/dinner copy completion. Recipe
creation/completion and cuisine verification retain GPT-4o mini. Photo jobs
retrieve existing images; they do not use an OpenAI image-generation model.
The review-link search script uses GPT-4.1 mini with the paid web-search tool.

Task overrides in `.env.example` take precedence over OPENAI_MODEL, which takes
precedence over task defaults. Leave OPENAI_MODEL unset for automatic cheap
routing. Restart the API and job workers after changing deployment settings.
These defaults do not automatically escalate to more expensive models on failure.
Model routing tests do not establish culinary accuracy; review completed content.

## Activate the daily allowance

The account screenshot shows eligibility for 10 million small-model tokens/day,
but input/output sharing is Disabled. Eligibility is not enrollment.

1. Open https://platform.openai.com/settings/organization/data-controls/sharing
   in the organization owning Spoonspin's API key.
2. Under **Share inputs and outputs**, choose **Enabled for selected projects**,
   select the project owning that key, and save. An organization owner must do
   this. The project's prompts and outputs may then be used to improve/train
   OpenAI models. The other feedback/evaluation sharing switches are not required.
3. Confirm the page says you are enrolled for complimentary daily tokens. Keep
   a positive account balance. Verify the production key belongs to that project.
4. Run a normal enrichment and inspect https://platform.openai.com/usage . Group
   usage by service tier and check for **data sharing incentive tier** input and
   output tokens; compare with Costs. Code cannot establish account enrollment.

GPT-4.1 nano, GPT-4o mini, and GPT-4.1 mini are in the eligible small-model pool.
The allowance is shared across eligible models/projects, resets at 00:00 UTC,
and is not a stored credit balance. A request that exceeds the daily quota is
charged in full. Web-search tools and other providers (Google, Apify) are not
covered. No account sharing settings are changed by this application.

Official terms: https://help.openai.com/en/articles/10306912
Model details: https://developers.openai.com/api/docs/models/gpt-4.1-nano
