# GitHub push -> production deploy setup

Bu repo artık `main` branch'e push gelince `.github/workflows/deploy-production.yml` workflow'unu çalıştıracak şekilde **SSH'siz / self-hosted runner** modeline göre hazırlandı.

## Çalışma mantığı
1. GitHub Actions tetiklenir (`push` on `main` veya `workflow_dispatch`)
2. Job, production sunucudaki self-hosted runner üzerinde çalışır
3. Runner, `/home/ubuntu/E-Cars/scripts/deploy_mytgo_from_main.sh origin/main` komutunu yerelde çalıştırır
4. Script:
   - `origin/main` çekip live repo'yu ona resetler
   - `git clean -fd` ile untracked dosyaları temizler
   - backend bağımlılıklarını kurar
   - frontend `npm ci && npm run build` çalıştırır
   - `dist/` içeriğini `/var/www/mytgo/` altına basar
   - `mytgo-backend` ve `mytgo-telegram-poller` servislerini restart eder
   - `http://127.0.0.1:8010/health` ile smoke check yapar

## Workflow labels
Workflow şu label'ı bekliyor:
- `self-hosted`
- `linux`
- `arm64`
- `mytgo`

## Kritik durum
Bu makinede şu an çalışan runner **E-Cars'ya değil başka repoya bağlı**:
- runner adı: `english-app-runner`
- bağlı repo: `omerfrktstboop/omer-learning-apk`

Bu yüzden workflow dosyası hazır olsa da, **E-Cars repo içinde çalışması için** runner'ın E-Cars reposuna bağlanması veya E-Cars için ikinci bir runner kurulması gerekiyor.

## Secrets gerekiyor mu?
Hayır. Bu modelde deploy için GitHub Actions SSH secret istemez.

## İlk canlı test
Runner E-Cars repo için bağlandıktan sonra:
```bash
git checkout main
git push origin main
```
Ardından GitHub Actions run logunda `test-and-deploy` job'unu kontrol et.

## Not
Deploy scripti `git clean -fd` kullandığı için `/home/ubuntu/E-Cars` altında commitlenmemiş / ignore dışı lokal dosya bırakmamak gerekir.
