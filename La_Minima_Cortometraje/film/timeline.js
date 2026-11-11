'use strict';
/* LA MÍNIMA — línea de tiempo (segundos) */
const SCENES = [
  { a: 0, b: 10, fn: sIntro },
  { a: 10, b: 22, fn: sMorning },
  { a: 22, b: 26, fn: sInvite },
  { a: 26, b: 48, fn: sDance },
  { a: 48, b: 60, fn: sStreet },
  { a: 60, b: 70, fn: sSecret1 },
  { a: 70, b: 77, fn: sSecret2 },
  { a: 77, b: 84, fn: sMontage },
  { a: 84, b: 94, fn: sCandle },
  { a: 94, b: 108, fn: sTito },
  { a: 108, b: 142, fn: sAlone },
  { a: 142, b: 152, fn: sWednesday },
  { a: 152, b: 182, fn: sPlaza },
  { a: 182, b: 210.2, fn: sHope },
  { a: 210.2, b: 225, fn: sTitle },
];
const DURATION = 224.75;
