// Ajoute les clés i18n P2 (reçu, journal complet, reprise) aux locales provider.
const fs = require('fs')
const path = require('path')

const DIR = 'd:/itvision-1/mobile/provider/src/i18n'

const ADD = {
  fr: {
    providerMissionCompleted: {
      receiptSaved: 'Reçu enregistré',
      receiptSavedBody: 'Le reçu PDF a été téléchargé.',
      receiptError: 'Impossible de télécharger le reçu',
    },
    providerMissionDetails: {
      openFullLog: 'Ouvrir le journal complet',
      resumeAction: 'Reprendre la mission',
      logTitle: 'Journal de la mission',
      logEmpty: 'Aucun événement enregistré pour le moment',
      logCurrent: 'État actuel',
    },
  },
  en: {
    providerMissionCompleted: {
      receiptSaved: 'Receipt saved',
      receiptSavedBody: 'The PDF receipt has been downloaded.',
      receiptError: 'Unable to download the receipt',
    },
    providerMissionDetails: {
      openFullLog: 'Open full log',
      resumeAction: 'Resume mission',
      logTitle: 'Mission log',
      logEmpty: 'No events recorded yet',
      logCurrent: 'Current state',
    },
  },
  wo: {
    providerMissionCompleted: {
      receiptSaved: 'Risi bi denc na',
      receiptSavedBody: 'Risi PDF bi dañu ko sotti.',
      receiptError: 'Mënula sotti risi bi',
    },
    providerMissionDetails: {
      openFullLog: 'Ubbi taarix bi mat',
      resumeAction: 'Tambali misiyoŋ bi',
      logTitle: 'Taarixu misiyoŋ bi',
      logEmpty: 'Amul beneen xew-xew buñu bind',
      logCurrent: 'Tàggat bi tey',
    },
  },
}

for (const locale of ['fr', 'en', 'wo']) {
  const file = path.join(DIR, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const ns of Object.keys(ADD[locale])) {
    json[ns] = { ...json[ns], ...ADD[locale][ns] }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n')
  console.log(`${locale}: +${Object.keys(ADD[locale].providerMissionCompleted).length}+${Object.keys(ADD[locale].providerMissionDetails).length} clés`)
}
