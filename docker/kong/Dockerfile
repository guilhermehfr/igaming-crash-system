FROM kong:3.9.1

USER root
RUN luarocks install lua-resty-openidc
RUN luarocks install kong-oidc
USER kong
