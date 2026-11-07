# Chamuyo

Juego privado para el celular. Llamás a famosos argentinos **inventados**, les hablás con el micrófono y tratás de chamuyarlos antes de que la desconfianza llegue a 10 y te corten.

- **App:** https://claude.ai/artifact/A46Dywu8CewYcjajV5cpcx (privada, solo la ve tu cuenta)
- **Código de la app:** `index.html` (es la misma página publicada como artifact)

## Cómo se juega

1. Elegís un famoso del elenco y leés su ficha: su historia, qué le baja la guardia, qué lo hace saltar y **el botín** que tenés que sacarle.
2. Dos formas de llamar:
   - **Llamar con voz:** abre la llamada en ElevenLabs. Permitís el micrófono, le hablás en español y te contesta con voz argentina. Si sospecha demasiado, te corta. Al volver a la app anotás si lo chamuyaste o te cortó.
   - **Jugar acá, con medidor:** chat dentro de la app con la barra de desconfianza en vivo (0 a 10). Escribís o dictás con el micrófono del teclado y el famoso te contesta en voz alta con la voz del celular. Al final ves qué cosas te subieron o bajaron la desconfianza.
3. **La ronda:** sumás amigos, se pasan el celu y la app lleva los puntos de cada uno (quedan guardados en ese navegador).

Puntos: 100 × dificultad si conseguís el botín, más un bonus por hacerlo en pocos mensajes (modo medidor) o +100 por hacerlo con voz.

## El elenco (agentes de voz en ElevenLabs)

Todos están en tu cuenta de ElevenLabs con la etiqueta `chamuyo`, usan voces argentinas de tu biblioteca y el modelo `claude-haiku-5-5`. Cada uno puede cortar la llamada solo.

| Personaje | Desconfía de entrada | Botín | Llamada de voz |
|---|---|---|---|
| Doña Beba Larrañaga (91) | 6/10 | El collar de perlas | [llamar](https://elevenlabs.io/app/talk-to?agent_id=agent_5501m6w2wr5zefa9x5fez7dkac0s) |
| Graciela "La Gata" Vidal (64) | 5/10 | Una seña para la revista | [llamar](https://elevenlabs.io/app/talk-to?agent_id=agent_0301m6w3dd7ae59v6nbw4nxc2nk6) |
| Mica Sosa (27) | 3/10 | La "tasa de aduana" de un canje | [llamar](https://elevenlabs.io/app/talk-to?agent_id=agent_4401m6w3dff7fn3917ct9v6595sx) |
| Lu "Turbo" Paredes (22) | 7/10 | El código de 6 dígitos | [llamar](https://elevenlabs.io/app/talk-to?agent_id=agent_4301m6w3epdwf67aqjr596vk8yen) |
| El Ruso Bertolotti (71) | 4/10 | Los derechos de "Avenida Nocturna" | [llamar](https://elevenlabs.io/app/talk-to?agent_id=agent_2201m6w3dhs6ffvbq0hbh3dqxq7m) |
| Rolo Benegas (63) | 6/10 | Un adelanto por un formato | [llamar](https://elevenlabs.io/app/talk-to?agent_id=agent_1901m6w3dks7edyskfj11wvrkpng) |
| Yamila "La Tanque" Arancibia (26) | 3/10 | Una transferencia a tu alias | [llamar](https://elevenlabs.io/app/talk-to?agent_id=agent_1901m6w3erekf1x9mfwm7mjsa6kk) |

## A tener en cuenta

- Las llamadas de voz gastan minutos de tu plan de ElevenLabs. No compartas los links: cualquiera que los tenga puede llamar con tu saldo.
- El modo con medidor usa tu cuenta de Claude; la primera vez la app te pide permiso.
- Dentro de la app de Claude el micrófono directo de la página está bloqueado, por eso en el modo con medidor se dicta con el micrófono del teclado. La llamada con voz no tiene esa limitación.
- Personajes, historias y voces son inventados. Ninguno es una persona real.

## Cambiar o sumar personajes

- **Modo con medidor:** editás el arreglo `CAST` en `index.html` (historia, debilidades, botín, frases) y se vuelve a publicar.
- **Modo voz:** el prompt de cada personaje se edita en ElevenLabs (Agents → el agente → System prompt).
