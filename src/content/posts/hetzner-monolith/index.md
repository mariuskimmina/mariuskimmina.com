---
title: Running a Monolith on Hetzner (Kubernetes Detox)
author: Marius Kimmina
date: 2025-03-30
tags: [aws, microservices, lambda, s3]
published: false
---

I created my first website using the LAMP stack and it often feels like times where much simpler back then.
I since ended up going down the Infrastructure rabbithole and am now deploying microservices on kubernetes for a living.

Now, over the last few months I've been working on a language learning app, mostly because of my own frustrations with existing
applications while studying korean. At it's core it's a simple flashcard based app and, perhaps more importantly, it's a monolith.

- docker-compose
  - backend
  - frontend
  - traefik
  - prometheus
  - grafana
  - uptime-kuma
- watchtower

### Let's talk about databases
