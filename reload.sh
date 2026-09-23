git add .
git commit -m "$!"
git push
curl -X POST mobile.quantize.me/api/deploy
