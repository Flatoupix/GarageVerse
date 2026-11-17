# T-014 · Prioriser les véhicules candidats pour les prochaines cartes

- **Priorité :** P2
- **Statut :** Backlog de contenu, modèles à valider
- **Sources :** [README.md](../README.md) « Véhicules candidats pour de futures cartes » ; [docs/meta.md](../docs/meta.md) §3

**Contexte.** La bible répertorie 50 candidats historiques à futures cartes. Le roster a beaucoup grandi depuis cette liste (131 cartes en v0.12.0) : **ne pas créer de doublons**.

**Liste source à auditer**
1. Abarth 500 ; 2. Acura NSX ; 3. Alpine A110 (1973) ; 4. Aston Martin DB7 ; 5. Audi R8 V10 ; 6. Bentley Continental GT ; 7. BMW M3 E46 ; 8. BMW M5 E60 ; 9. BRABUS XLP 800 6×6 ; 10. Bugatti Veyron.
11. BYD Yangwang U9 Xtreme ; 12. Cadillac Escalade ; 13. Corvette C6 ZR1 ; 14. Citroën C1 ; 15. Dacia Logan ; 16. De Tomaso Pantera ; 17. Challenger SRT Demon 170 ; 18. Ferrari Enzo ; 19. Fiat Punto ; 20. Mustang Shelby GT500.
21. GMC Sierra 3500HD ; 22. Hennessey Venom F5 (version à préciser) ; 23. Civic Type R EK9 ; 24. Hummer H1 ; 25. Hyundai i30 N ; 26. Jaguar F-Type ; 27. Grand Cherokee Trackhawk ; 28. Koenigsegg Agera ; 29. Koenigsegg One:1 ; 30. KTM X-Bow.
31. Lamborghini Aventador SV ; 32. Delta HF Integrale ; 33. Lexus IS 200 ; 34. Lotus Elise (version à préciser) ; 35. Mazda MX-5 NA ; 36. McLaren Senna ; 37. Mercedes-Benz CLR (1999) ; 38. SLR McLaren ; 39. Lancer Evolution VIII ; 40. Skyline R34 V-Spec (finition à préciser).
41. Opel Zafira OPC ; 42. Pagani Zonda R ; 43. Carrera GT ; 44. RAM 1500 TRX ; 45. Renault Master ; 46. RUF CTR Yellowbird ; 47. SEAT Ibiza 6L ; 48. Tesla Model S ; 49. Toyota Supra Mk4 (déjà citée en Collection 001) ; 50. Volkswagen Passat B5.

**À faire**
- Croiser chaque candidat avec `src/data/roster.json` : existant, variante technique à arbitrer ou absent.
- Retenir un lot cohérent sans surreprésenter les hypercars ; vérifier année, version, motorisation et provenance.
- Documenter les données réelles et générer les images seulement après validation de ce lot.

**Critères de validation**
- [ ] Tableau d'inventaire des 50 candidats rapproché du roster courant.
- [ ] Aucun doublon accidentel (notamment Lotus, R34, Supra et Venom).
- [ ] Liste priorisée des cartes **réellement** nouvelles avec données sourcées.
