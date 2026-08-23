// Import d une activite : fichier de trace ou capture d ecran.
import { parseGpx, parseTcx, parseActivityFile, parseActivityText, toSession,
  sportFrom, haversine, elevationGain, toSeconds, fmtDuree, fmtTemps,
  inRange, isGpx, isTcx, ELEV_NOISE_M }
  from '../../src/features/train/activityParse.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── bornes du plausible ───
a(inRange('km', 12.5) === 12.5, 'une distance ordinaire passe')
a(inRange('km', 4000) === null, 'un marathon de 4 000 km est ecarte')
a(inRange('km', 0) === null, 'une distance nulle aussi')
a(inRange('hr', 210) === 210 && inRange('hr', 400) === null, 'frequence cardiaque bornee')
a(inRange('seconds', 5) === null, 'cinq secondes ne sont pas une seance')

// ─── sports ───
a(sportFrom('Running') === 'course' && sportFrom('Course à pied') === 'course', 'course en deux langues')
a(sportFrom('Mountain Biking') === 'vtt', 'le VTT contient « bike » : il passe avant le velo')
a(sportFrom('Ride') === 'velo' && sportFrom('Vélo de route') === 'velo', 'velo')
a(sportFrom('Trail Run') === 'trail', 'le trail avant la course')
a(sportFrom('Pilates') === null, 'un sport inconnu ne devient pas un sport approximatif')

// ─── distance et denivele ───
a(Math.round(haversine({ lat: 45.75, lon: 4.85 }, { lat: 45.76, lon: 4.85 })) === 1112, 'un centieme de degre de latitude fait 1112 m')
// Le bruit du GPS oscille de deux metres a l arret : somme brute, un
// parcours plat afficherait des centaines de metres de denivele.
const bruit = []
for (let i = 0; i < 200; i++) bruit.push(100 + (i % 2 ? 2 : 0))
a(elevationGain(bruit) === 0, `oscillation de 2 m sous le seuil de ${ELEV_NOISE_M} m -> 0 m de denivele`)
a(elevationGain([100, 150, 120, 170]) === 100, 'deux vraies cotes : 50 + 50')
a(elevationGain([100, null, 150]) === 50, 'un point sans altitude ne coupe pas le calcul')

// ─── GPX ───
const mkGpx = (pts, type) => `<?xml version="1.0"?><gpx version="1.1"><trk>${type ? `<type>${type}</type>` : ''}<trkseg>` +
  pts.map(([la, lo, el, t]) => `<trkpt lat="${la}" lon="${lo}"><ele>${el}</ele><time>${t}</time></trkpt>`).join('') +
  '</trkseg></trk></gpx>'
const gpx = mkGpx([
  [45.7500, 4.8500, 170, '2026-08-15T07:00:00Z'],
  [45.7600, 4.8500, 180, '2026-08-15T07:06:00Z'],
  [45.7700, 4.8500, 230, '2026-08-15T07:12:00Z'],
], 'Running')
a(isGpx(gpx) && !isTcx(gpx), 'format reconnu')
const g = parseGpx(gpx)
a(g.sport === 'course', 'sport lu dans le fichier')
a(g.startISO === '2026-08-15' && g.startTime === '07:00', 'date et heure de depart')
a(g.km === 2.22, `distance calculee point a point : ${g.km} km`)
a(g.seconds === 720, '12 minutes entre le premier et le dernier point')
a(g.elevation === 60, `denivele ${g.elevation} m (10 + 50)`)
a(g.points === 3, '3 points de trace')
a(parseGpx('<gpx></gpx>').km === 0, 'trace vide -> aucune distance, sans lever')

// ─── TCX ───
const tcx = `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Biking">
<Id>2026-08-16T18:30:00Z</Id>
<Lap><TotalTimeSeconds>1800.0</TotalTimeSeconds><DistanceMeters>15000.0</DistanceMeters><Calories>420</Calories>
<AverageHeartRateBpm><Value>142</Value></AverageHeartRateBpm>
<Track><Trackpoint><LatitudeDegrees>45.7</LatitudeDegrees><AltitudeMeters>200</AltitudeMeters><DistanceMeters>500</DistanceMeters></Trackpoint>
<Trackpoint><LatitudeDegrees>45.8</LatitudeDegrees><AltitudeMeters>260</AltitudeMeters><DistanceMeters>15000</DistanceMeters></Trackpoint></Track></Lap>
<Lap><TotalTimeSeconds>900.0</TotalTimeSeconds><DistanceMeters>7000.0</DistanceMeters><Calories>180</Calories>
<AverageHeartRateBpm><Value>150</Value></AverageHeartRateBpm></Lap>
</Activity></Activities></TrainingCenterDatabase>`
a(isTcx(tcx), 'TCX reconnu')
const t = parseTcx(tcx)
a(t.sport === 'velo', 'sport lu dans l attribut')
a(t.seconds === 2700, 'les deux tours additionnes : 45 min')
a(t.km === 22, `distance ${t.km} km : les tours, pas les points de trace qui la repeteraient`)
a(t.hr === 146, 'frequence moyenne des tours')
a(t.calories === 600, 'calories additionnees')
a(t.elevation === 60, 'denivele depuis les altitudes')
a(t.startISO === '2026-08-16' && t.startTime === '18:30', 'date et heure')
a(parseActivityFile(tcx).format === 'tcx' && parseActivityFile(gpx).format === 'gpx', 'le format est detecte seul')
a(parseActivityFile('bonjour') === null, 'un fichier quelconque -> null, pas une seance vide')

// ─── capture d ecran ───
a(toSeconds('1:23:45') === 5025 && toSeconds('45:12') === 2712, 'chronos lus')
a(toSeconds('1h30') === 5400 && toSeconds('45 min') === 2700, 'formats parles')
a(toSeconds('nawak') === null, 'texte illisible -> null')

const strava = `Course à pied du matin
Distance
12,4 km
Temps
1:02:15
Allure
5:01 /km
Dénivelé
248 m
FC moy
151 bpm
Calories
890`
const cap = parseActivityText(strava)
a(cap.sport === 'course', 'sport devine dans le texte')
a(cap.km === 12.4, 'distance avec virgule decimale')
a(cap.seconds === 3735, 'temps lu')
a(cap.elevation === 248 && cap.hr === 151 && cap.calories === 890, 'denivele, cardio, calories')
a(cap.pace === 301, "allure convertie en secondes au kilometre")

// L allure reconstitue ce qui manque.
const sansTemps = parseActivityText('Distance\n10 km\nAllure\n5:00 /km')
a(sansTemps.seconds === 3000, 'temps deduit de la distance et de l allure')
const sansDist = parseActivityText('Temps\n50:00\nAllure\n5:00 /km')
a(sansDist.km === 10, 'distance deduite du temps et de l allure')

// Valeur au-dessus du libelle ou en dessous : les deux dispositions existent.
a(parseActivityText('Distance 8,2 km').km === 8.2, 'valeur sur la meme ligne')
a(parseActivityText('7,5 km\nDistance').km === 7.5, 'valeur au-dessus du libelle')
a(parseActivityText('').km === null, 'capture illisible -> aucun champ invente')

// ─── vers une seance ───
a(fmtDuree(3735) === '1 h 02' && fmtDuree(2700) === '45 min', 'duree a la forme de l application')
a(fmtTemps(3735) === '1:02:15' && fmtTemps(2712) === '45:12', 'temps a la forme des champs de sport')
const sess = toSession(g, { id: 'x' })
a(sess.date === '2026-08-15' && sess.heure === '07:00', 'date et heure reprises')
a(sess.sport === 'course' && sess.statut === 'realise', 'sport et statut')
a(sess.duree === '12 min' && sess.data.temps === '12:00', 'duree et temps')
a(sess.data.distance === 2.22 && sess.data.denivele === 60, 'distance et denivele dans les champs du sport')
a(sess.source === 'gpx', 'la provenance est conservee')
const sansSport = toSession(parseActivityText('Distance\n5 km\nTemps\n25:00'), { date: '2026-08-20' })
a(sansSport.sport === null, "sport indeterminable -> laisse vide plutot qu invente : une seance mal rangee fausserait sa discipline")
a(toSession(null) === null && toSession(g, { date: null }) !== null, 'activite nulle -> null')
a(toSession({ km: 5 }, {}) === null, 'sans date, aucune seance')
console.log('\nALL PASS')
