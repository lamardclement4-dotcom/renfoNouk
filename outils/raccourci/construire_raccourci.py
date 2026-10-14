#!/usr/bin/env python3
"""Construit le raccourci iOS « Renfo » (Apple Watch → Renfo) et le signe.

Le raccourci tient en trois actions, pour que la mise en place se résume à
« installer, coller sa clé » :

  1. Texte : la clé personnelle, demandée à l'installation (question
     d'import) — elle n'est donc jamais dans le fichier publié ;
  2. Rechercher des échantillons de santé : Type « Sommeil », date de
     début dans le dernier jour ;
  3. Obtenir le contenu de l'URL : POST vers deposer_nuit_montre
     (migration 0006), corps JSON = la clé et trois listes tirées des
     échantillons (dates de début, dates de fin, valeurs).

Pas de boucle ni d'assemblage de texte : c'est le serveur qui remet les
listes en lignes. La clé publique de l'app (anon) va dans l'adresse, ce
qui évite tout en-tête à régler. Elle est publique par conception, comme
dans le code de l'app.

Formats tirés de la référence de Federico Viticci (MacStories,
shortcuts-playground-plugin : HEALTHKIT.md, FILTERS.md, ACTIONS.md) et
d'un raccourci signé publié (youtube-dl-nas) pour les questions d'import.

Usage (macOS, depuis la racine du dépôt) :
  python3 outils/raccourci/construire_raccourci.py          # source XML
  python3 outils/raccourci/construire_raccourci.py --signer # + fichier signé
La signature (« shortcuts sign --mode anyone ») passe par le compte iCloud
du Mac. Le fichier signé est publié dans public/raccourci/Renfo.shortcut.
"""

import argparse
import plistlib
import subprocess
import tempfile
import uuid
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name("Renfo.plist")
SIGNE = RACINE / "public" / "raccourci" / "Renfo.shortcut"
ESPACE = uuid.UUID("5f0c8e1a-6a8e-4b7e-9d3f-2c1b0a9e8d7c")
REMPLACEMENT = "￼"


def lire_env():
    env = {}
    for nom in (".env", ".env.production", ".env.local"):
        chemin = RACINE / nom
        if not chemin.exists():
            continue
        for ligne in chemin.read_text().splitlines():
            ligne = ligne.strip()
            if ligne and not ligne.startswith("#") and "=" in ligne:
                cle, val = ligne.split("=", 1)
                env[cle.strip()] = val.strip().strip('"').strip("'")
    url, anon = env.get("VITE_SUPABASE_URL"), env.get("VITE_SUPABASE_ANON_KEY")
    if not url or not anon:
        raise SystemExit("VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY introuvables dans .env")
    return url.rstrip("/"), anon


def uid(nom):
    return str(uuid.uuid5(ESPACE, nom)).upper()


def sortie(nom, nom_sortie, propriete=None):
    v = {"Type": "ActionOutput", "OutputUUID": uid(nom), "OutputName": nom_sortie}
    if propriete:
        v["Aggrandizements"] = [{"PropertyName": propriete, "Type": "WFPropertyVariableAggrandizement"}]
    return v


def texte(*parties):
    s, pieces = "", {}
    for p in parties:
        if isinstance(p, str):
            s += p
        else:
            pieces[f"{{{len(s)}, 1}}"] = p
            s += REMPLACEMENT
    return {"Value": {"attachmentsByRange": pieces, "string": s}, "WFSerializationType": "WFTextTokenString"}


def champ(cle, valeur):
    return {"WFItemType": 0, "WFKey": texte(cle), "WFValue": valeur}


def action(identifiant, **parametres):
    return {"WFWorkflowActionIdentifier": identifiant, "WFWorkflowActionParameters": parametres}


def construire():
    url, anon = lire_env()
    adresse = f"{url}/rest/v1/rpc/deposer_nuit_montre?apikey={anon}"
    actions = [
        # 0. Ce que fait le raccourci, lisible dans l'app Raccourcis.
        action(
            "is.workflow.actions.comment",
            WFCommentActionText="Renfo : envoie ta dernière nuit (Apple Watch, via Santé) à Renfo. "
            "Seuls les segments de sommeil sont lus. Lance-le chaque matin avec une automatisation "
            "« Quand mon réveil est arrêté ».",
        ),
        # 1. La clé, posée à l'installation (question d'import).
        action("is.workflow.actions.gettext", UUID=uid("cle"), WFTextActionText="colle-ta-cle-renfo"),
        # 2. Les segments de la dernière nuit.
        action(
            "is.workflow.actions.filter.health.quantity",
            UUID=uid("sommeil"),
            WFContentItemLimitEnabled=False,
            WFContentItemFilter={
                "Value": {
                    "WFActionParameterFilterPrefix": 1,
                    "WFContentPredicateBoundedDate": False,
                    "WFActionParameterFilterTemplates": [
                        {
                            "Bounded": True,
                            "Operator": 4,
                            "Property": "Type",
                            "Removable": False,
                            "Values": {"Enumeration": {"Value": "Sleep", "WFSerializationType": "WFStringSubstitutableState"}},
                        },
                        {
                            "Bounded": True,
                            "Operator": 1001,
                            "Property": "Start Date",
                            "Removable": True,
                            "Values": {"Number": 1, "Unit": 16384},
                        },
                    ],
                },
                "WFSerializationType": "WFContentPredicateTableTemplate",
            },
        ),
        # 3. L'envoi : la clé et trois listes parallèles.
        action(
            "is.workflow.actions.downloadurl",
            UUID=uid("envoi"),
            WFURL=adresse,
            WFHTTPMethod="POST",
            WFHTTPBodyType="JSON",
            ShowHeaders=False,
            WFJSONValues={
                "Value": {
                    "WFDictionaryFieldValueItems": [
                        champ("jeton", texte(sortie("cle", "Text"))),
                        champ("debuts", texte(sortie("sommeil", "Health Samples", "Start Date"))),
                        champ("fins", texte(sortie("sommeil", "Health Samples", "End Date"))),
                        champ("valeurs", texte(sortie("sommeil", "Health Samples", "Value"))),
                    ]
                },
                "WFSerializationType": "WFDictionaryFieldValue",
            },
        ),
    ]
    return {
        "WFWorkflowName": "Renfo",
        "WFWorkflowActions": actions,
        "WFWorkflowClientVersion": "2700.0.4",
        "WFWorkflowClientRelease": "26A0000a",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconGlyphNumber": 59782, "WFWorkflowIconStartColor": 946986751},
        "WFWorkflowHasOutputFallback": False,
        "WFWorkflowHasShortcutInputVariables": False,
        "WFWorkflowImportQuestions": [
            {
                "ActionIndex": 1,
                "Category": "Parameter",
                "DefaultValue": "",
                "ParameterKey": "WFTextActionText",
                "Text": "Colle ta clé Renfo (Profil › Apple Watch › Créer ma clé)",
            }
        ],
        "WFWorkflowInputContentItemClasses": [],
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowTypes": [],
        "WFQuickActionSurfaces": [],
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--signer", action="store_true", help="signer et publier dans public/raccourci/")
    a = p.parse_args()
    flux = construire()
    SOURCE.write_bytes(plistlib.dumps(flux, fmt=plistlib.FMT_XML, sort_keys=False))
    print("source :", SOURCE.relative_to(RACINE))
    if a.signer:
        SIGNE.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(suffix=".shortcut") as brut:
            brut.write(plistlib.dumps(flux, fmt=plistlib.FMT_BINARY, sort_keys=False))
            brut.flush()
            subprocess.run(["shortcuts", "sign", "--mode", "anyone", "--input", brut.name, "--output", str(SIGNE)], check=True)
        print("signé :", SIGNE.relative_to(RACINE))


if __name__ == "__main__":
    main()
