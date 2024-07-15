import {flagsName, moduleName, moduleNameShort} from './consts.js';
import {
  searchClassFeatures,
  searchItems,
  searchSpells,
  searchRaceFeatures
} from './checkFunctions.js';
import pickItemDialog from './pickItemDialog.js';

import {updateJournal} from './journal.js';

const chris = chrisPremades.helpers;

async function loadJsonData(fileType = 'feats') {
  const allowedTypes = ['feats', 'abilities', 'items', 'races', 'spells'];
  try {
    const response = await fetch(`modules/${moduleName}/scripts/data/${allowedTypes.includes(fileType) ? fileType : 'feats'}.json`);
    if (!response.ok) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading the JSON file:', error);
  }
}

const processResult = async (actor, {
  addItems,
  removeItems,
}) => {
  const resultAddedItems = await actor.createEmbeddedDocuments('Item', addItems);
  await actor.deleteEmbeddedDocuments('Item', removeItems);

  const journal = await updateJournal(actor, resultAddedItems);

  const page = journal.pages.getName(actor.name);
  const content = await renderTemplate(`modules/${moduleName}/templates/resultDialog.hbs`, {
    actorName: actor.name,
    actorUuid: `Actor.${actor.id}`,
    pageUuid: `JournalEntry.${page.parent.id}.JournalEntryPage.${page.id}`
  });

  await chris.dialog(game.i18n.localize(`${moduleNameShort}.updateFinished`), [['Закрыть', true]], content);
};

const checkActor = async (doc) => {
  const featData = await loadJsonData('feats');
  const abilitiesData = await loadJsonData('abilities');
  const raceData = await loadJsonData('races');
  const spellData = await loadJsonData('spells');

  const updatedData = await Promise.all([
    searchItems(doc, featData, 'feat'),
    searchClassFeatures(doc, abilitiesData),
    searchSpells(doc, spellData),
    searchRaceFeatures(doc, raceData)
  ]);

  let {
    addItems,
    removeItems,
    manualUpdate,
    itemById
  } = updatedData.reduce((acc, data) => {
    if (data.addItems) {
      acc.addItems = [...acc.addItems, ...data.addItems];
    }
    if (data.removeItems) {
      acc.removeItems = [...acc.removeItems, ...data.removeItems];
    }
    if (data.manualUpdate) {
      acc.manualUpdate = {...acc.manualUpdate, ...data.manualUpdate};
    }
    if (data.itemById) {
      acc.itemById = {...acc.itemById, ...data.itemById};
    }
    return acc;
  }, {addItems: [], removeItems: [], manualUpdate: {}, itemById: {}});


  if (Object.keys(manualUpdate).length > 0) {
    await pickItemDialog(manualUpdate, async (selected) => {
      const selectedToAdd = [];
      const selectedToDelete = [];
      selected.forEach(featId => {
          const item = itemById[featId];
          selectedToAdd.push(item);
          selectedToDelete.push(item.flags[flagsName].oldId);
        }
      );
      if (selectedToAdd.length > 0 && selectedToDelete.length > 0) {
        addItems = [...addItems, ...selectedToAdd];
        removeItems = [...removeItems, ...selectedToDelete];
        await processResult(doc, {addItems, removeItems});
      }
    });
  } else {
    await processResult(doc, {addItems, removeItems});
  }
}

Hooks.on('getActorDirectoryEntryContext', (_, options) => {
  options.push({
    name: `${moduleNameShort}.integrateButton`,
    icon: '<i class="fas fa-screwdriver-wrench"></i>',
    callback: async ([entry]) => {
      const actorId = entry.dataset.documentId;
      const actor = game.actors?.get(actorId);

      if (actor && chrisPremades) {
        if (ui.notifications) {
          ui.notifications.info(game.i18n.localize(`${moduleNameShort}.CONVERT_START`));
        }
        await checkActor(actor)
        if (ui.notifications) {
          ui.notifications.info(game.i18n.localize(`${moduleNameShort}.CONVERT_END`));
        }
      }
    },
    condition: (li) => {
      const actorId = li.data('documentId');
      const actor = game.actors?.get(actorId);
      // Show the option only if the actor is a player character (PC)
      // @ts-ignore
      return actor && actor.type === 'character';
    },
  });
});

Handlebars.registerHelper('fixFeatName', function (name) {
  const regex = /(?<= - ).+?(?= \/)/;
  const match = name.match(regex);
  return match ? match[0] : name;
});
