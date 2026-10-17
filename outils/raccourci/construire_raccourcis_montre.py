#!/usr/bin/env python3
"""Raccourcis à lancer depuis l'Apple Watch : « Noter ma séance » et
« J'ai bu ».

Ils n'utilisent que des actions qui marchent sur la montre (liste, choix
dans une liste, demande d'un nombre, texte, Obtenir le contenu de l'URL,
notification) et déposent une ligne dans la boîte de la montre
(deposer_mesures_montre, migration 0005), avec la même clé que « Envoyer
ma nuit » :

  seance;<date de fin>;<sport>;<minutes>;<effort>
  eau;<date>;<quantité>

Le site range la séance dans le calendrier (réalisée, avec son effort) et
l'eau dans Hydratation au prochain relevé.

  python3 outils/raccourci/construire_raccourcis_montre.py           # sources .plist
  python3 outils/raccourci/construire_raccourcis_montre.py --signer  # + fichiers signés

« Afficher sur l'Apple Watch » se règle dans l'app Raccourcis (Détails du
raccourci) : la valeur à écrire dans le fichier n'est pas documentée, elle
n'est pas devinée ici.
"""
import argparse
import plistlib
import subprocess
import tempfile
import unicodedata

from construire_raccourci import RACINE, action, champ, lire_env, sortie, texte, uid

ICI = RACINE / "outils" / "raccourci"
PUBLIC = RACINE / "public" / "raccourci"

SPORTS = ["Course", "Vélo", "Natation", "Musculation", "Marche", "Trail", "Cross-training", "Yoga", "Football", "Tennis / padel", "Sports de combat", "Escalade"]
EFFORTS = ["2 · très facile", "3 · facile", "4 · modéré", "5 · moyen", "6 · soutenu", "7 · dur", "8 · très dur", "9 · presque maximal", "10 · maximal"]
QUANTITES = ["250 ml (un verre)", "330 ml (une canette)", "500 ml (une gourde)", "750 ml", "1 L"]
DATE = {"Type": "CurrentDate"}


def liste(nom, items):
    return action(
        "is.workflow.actions.list",
        UUID=uid(nom),
        WFItems=[{"WFItemType": 0, "WFValue": texte(i)} for i in items],
    )


def choisir(nom, nom_liste, question):
    return action(
        "is.workflow.actions.choosefromlist",
        UUID=uid(nom),
        WFInput={"Value": sortie(nom_liste, "List"), "WFSerializationType": "WFTextTokenAttachment"},
        WFChooseFromListActionPrompt=question,
        WFChooseFromListActionSelectMultiple=False,
    )


def choix(nom):
    return sortie(nom, "Chosen Item")


def deposer(url, anon, nom_ligne):
    return action(
        "is.workflow.actions.downloadurl",
        UUID=uid("depot"),
        WFURL=f"{url}/rest/v1/rpc/deposer_mesures_montre?apikey={anon}",
        WFHTTPMethod="POST",
        WFHTTPBodyType="JSON",
        ShowHeaders=False,
        WFJSONValues={
            "Value": {"WFDictionaryFieldValueItems": [
                champ("jeton", texte(sortie("cle", "Text"))),
                champ("texte", texte(sortie(nom_ligne, "Text"))),
            ]},
            "WFSerializationType": "WFDictionaryFieldValue",
        },
    )


def fin(message_ok, message_erreur):
    """Notification en français : réussite, ou erreur claire si le serveur
    répond par une erreur technique (JSON avec « "code" »)."""
    return [
        action("is.workflow.actions.comment", WFCommentActionText="Si le serveur répond par une erreur technique (en anglais), afficher un message en français."),
        action(
            "is.workflow.actions.conditional",
            GroupingIdentifier=uid("si-erreur"),
            WFControlFlowMode=0,
            WFCondition=99,
            WFConditionalActionString='"code"',
            WFInput={"Type": "Variable", "Variable": {"Value": sortie("depot", "Contents of URL"), "WFSerializationType": "WFTextTokenAttachment"}},
        ),
        action("is.workflow.actions.notification", UUID=uid("notif-erreur"), WFNotificationActionTitle=texte("Renfo"), WFNotificationActionBody=texte(message_erreur), WFNotificationActionSound=False),
        action("is.workflow.actions.conditional", GroupingIdentifier=uid("si-erreur"), WFControlFlowMode=1),
        action("is.workflow.actions.notification", UUID=uid("notif"), WFNotificationActionTitle=texte("Renfo"), WFNotificationActionBody=message_ok, WFNotificationActionSound=False),
        action("is.workflow.actions.conditional", GroupingIdentifier=uid("si-erreur"), WFControlFlowMode=2),
    ]


def enveloppe(nom, actions, glyphe, couleur):
    return {
        "WFWorkflowName": nom,
        "WFWorkflowActions": actions,
        "WFWorkflowClientVersion": "2700.0.4",
        "WFWorkflowClientRelease": "26A0000a",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconGlyphNumber": glyphe, "WFWorkflowIconStartColor": couleur},
        "WFWorkflowHasOutputFallback": False,
        "WFWorkflowHasShortcutInputVariables": False,
        "WFWorkflowImportQuestions": [{
            "ActionIndex": 1,
            "Category": "Parameter",
            "DefaultValue": "",
            "ParameterKey": "WFTextActionText",
            "Text": "Colle ta clé (la même que pour « Envoyer ma nuit » : site Renfo › Profil › Apple Watch)",
        }],
        "WFWorkflowInputContentItemClasses": [],
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowTypes": [],
        "WFQuickActionSurfaces": [],
    }


def seance(url, anon):
    actions = [
        action("is.workflow.actions.comment", WFCommentActionText="Note dans Renfo la séance que tu viens de finir : sport, durée et effort ressenti. Elle compte dans ta charge d’entraînement. Marche sur l’Apple Watch."),
        action("is.workflow.actions.gettext", UUID=uid("cle"), WFTextActionText="colle-ta-cle-renfo"),
        liste("sports", SPORTS),
        choisir("sport", "sports", "Quel sport ?"),
        action("is.workflow.actions.ask", UUID=uid("duree"), WFAskActionPrompt="Durée, en minutes ?", WFInputType="Number"),
        liste("efforts", EFFORTS),
        choisir("effort", "efforts", "Effort ressenti ?"),
        action("is.workflow.actions.gettext", UUID=uid("ligne"), WFTextActionText=texte("seance;", DATE, ";", choix("sport"), ";", sortie("duree", "Provided Input"), ";", choix("effort"))),
        deposer(url, anon, "ligne"),
    ] + fin(
        texte("Séance notée : ", choix("sport"), ", ", sortie("duree", "Provided Input"), " min, effort ", choix("effort"), ". Elle arrive dans ton calendrier à la prochaine ouverture de Renfo."),
        "Renfo n’a pas pu noter ta séance (clé refusée ou serveur pas à jour). Sur l’iPhone : site Renfo › Profil › Apple Watch › « Ça ne marche pas ? ».",
    )
    return enveloppe("Noter ma séance", actions, 59782, 946986751)


def eau(url, anon):
    actions = [
        action("is.workflow.actions.comment", WFCommentActionText="Note dans Renfo ce que tu viens de boire. Marche sur l’Apple Watch."),
        action("is.workflow.actions.gettext", UUID=uid("cle"), WFTextActionText="colle-ta-cle-renfo"),
        liste("quantites", QUANTITES),
        choisir("quantite", "quantites", "Combien ?"),
        action("is.workflow.actions.gettext", UUID=uid("ligne"), WFTextActionText=texte("eau;", DATE, ";", choix("quantite"))),
        deposer(url, anon, "ligne"),
    ] + fin(
        texte("Noté : ", choix("quantite"), " d’eau. Ça arrive dans Hydratation à la prochaine ouverture de Renfo."),
        "Renfo n’a pas pu noter ton eau (clé refusée ou serveur pas à jour). Sur l’iPhone : site Renfo › Profil › Apple Watch › « Ça ne marche pas ? ».",
    )
    return enveloppe("J’ai bu", actions, 59782, 946986751)


def signer(flux, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".shortcut") as brut:
        brut.write(plistlib.dumps(flux, fmt=plistlib.FMT_BINARY, sort_keys=False))
        brut.flush()
        subprocess.run(["shortcuts", "sign", "--mode", "anyone", "--input", brut.name, "--output", str(destination)], check=True)
    # Nom de fichier en NFC (« é » d'un seul caractère), comme l'adresse
    # que le site encode.
    for f in destination.parent.iterdir():
        nfc = unicodedata.normalize("NFC", f.name)
        if nfc != f.name and nfc == destination.name:
            f.rename(destination)
    destination.chmod(0o644)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--signer", action="store_true", help="signer et publier dans public/raccourci/")
    a = p.parse_args()
    url, anon = lire_env()
    for flux, fichier in ((seance(url, anon), "Noter-ma-seance"), (eau(url, anon), "J-ai-bu")):
        source = ICI / f"{fichier}.plist"
        source.write_bytes(plistlib.dumps(flux, fmt=plistlib.FMT_XML, sort_keys=False))
        print("source :", source.relative_to(RACINE))
        if a.signer:
            dest = PUBLIC / f"{flux['WFWorkflowName']}.shortcut"
            signer(flux, dest)
            print("signé :", dest.relative_to(RACINE))


if __name__ == "__main__":
    main()
