# Fidan Atlası

Fidan Atlası, sahadaki fidan dikim noktalarını harita üzerinde işaretlemeyi ve keşfetmeyi sağlayan web uygulamasıdır. Uygulama Vite + React + TypeScript + MapLibre tabanlıdır ve Supabase (PostGIS + Edge Functions) ile çalışır.

**Canlı Uygulama:** https://fidan-atlasi.pages.dev

## Özellikler

- Harita üzerinde fidan noktası ekleme ve görüntüleme
- Kategori bazlı filtreleme
- Fotoğraf yükleme (imzalı URL ile)
- Cloudflare Turnstile ile bot koruması

## Mimari Özet

- **Frontend:** Vite, React, TypeScript, MapLibre
- **Backend:** Supabase (Postgres + PostGIS + Storage + Edge Functions)
- **Güvenlik:** RLS politikaları + imzalı upload + Turnstile doğrulama

## Geliştirme

```bash
npm install
npm run dev
```

> Not: Geliştirme ortamında gerekli env değişkenleri sağlanmazsa uygulama sınırlı/yerel modda çalışabilir.

## Katkı Sağlamak

 Katkı, issue açmak, öneri sunmak ve PR göndermek serbesttir. Özellikle şu alanlarda destek değerlidir:

- UI/UX iyileştirmeleri (harita etkileşimleri, bottom-sheet, filtre deneyimi)

- Supabase RLS politikaları ve güvenlik sertleştirmeleri

- Edge Functions (signed upload, create_entry, bbox performansı)

- Mobil deneyim, performans, erişilebilirlik

- Toplu veri ekleme / import akışları

##  Roadmap

- Toplu veri ekleme (CSV/GeoJSON import) + doğrulama ekranı

- Sosyal medyada paylaşım akışı (kart görseli üretimi)

- Gelişmiş arama ve etiketleme
