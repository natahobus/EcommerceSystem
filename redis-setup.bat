@echo off
echo Configurando Redis para cache distribuído...

echo Criando arquivo de configuração Redis...
echo port 6379 > redis.conf
echo bind 127.0.0.1 >> redis.conf
echo maxmemory 256mb >> redis.conf
echo maxmemory-policy allkeys-lru >> redis.conf
echo save 900 1 >> redis.conf
echo save 300 10 >> redis.conf
echo save 60 10000 >> redis.conf

echo Configuração Redis criada em redis.conf
echo Para iniciar: redis-server redis.conf
pause