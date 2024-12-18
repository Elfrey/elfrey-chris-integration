import {flagsName} from './consts.js'

const laaruFeatsCompendium = 'laaru-dnd5-hw.classfeatures';
const laaruSpellsCompendium = 'laaru-dnd5-hw.spells';
const chrisFeatsCompendium = 'chris-premades.CPR Feats';
const chrisClassFeaturesCompendium = 'chris-premades.CPR Class Features';
const chrisRaceFeaturesCompendium = 'chris-premades.CPR Race Features';
const chrisSpellsCompendium = 'chris-premades.CPR Spells';
const srdSpellCompendium = 'dnd5e.spells';

const notSafeToRename = {
  feat: [],
  spell: ['Zone of Truth'],
  race: ['Astral Spark'],
  class: [
    "Formulas: Gelid",
    "Formulas: Alluring",
    "Formulas: Aether",
    "Formulas: Conversant",
    "Formulas: Shielded",
    "Formulas: Percipient",
    "Formulas: Rapidity",
    "Formulas: Vermillion",
    "Formulas: Sagacity",
    "Formulas: Unbreakable",
    "Formulas: Precision",
    "Formulas: Celerity",
    "Formulas: Reconstruction",
    "Formulas: Cruelty",
    "Formulas: Potency",
    "Formulas: Nighteye",
    "Formulas: Impermeable",
    "Formulas: Embers",
    "Formulas: Deftness",
    "Formulas: Mobility"
  ]
}

const chris = chrisPremades.helpers;

const emptyResult = {
  addItems: [],
  removeItems: [],
  manualUpdate: {},
  itemById: {},
}

const updateDescription = (item1, item2, addName = false) => {
  if (!item1) {
    return '';
  }
  let ruPart = typeof item1 === 'string' ? item1 : item1.system.description.value;
  if (addName) {
    ruPart = `<p><b>${item1.name}</b></p>${ruPart}`;
  }
  return `${ruPart} <hr /> ${item2.system.description.value}`
}

export const searchClassFeatures = async (actor, data) => {
  if (actor.type === 'npc') {
    return {...emptyResult};
  }
  let classFeatures = {
    addItems: [],
    removeItems: [],
    manualUpdate: {},
  };
  for (let actorClass in actor.classes) {
    const className = actor.classes[actorClass].name;

    if (data[className]) {
      if (data[className].base) {
        const {
          addItems,
          removeItems,
          manualUpdate,
          itemById
        } = await searchItems(actor, data[className].base, 'class', chrisClassFeaturesCompendium, laaruFeatsCompendium);
        classFeatures = {
          addItems: [
            ...classFeatures.addItems,
            ...addItems
          ],
          removeItems: [
            ...classFeatures.removeItems,
            ...removeItems
          ],
          manualUpdate: {
            ...classFeatures.manualUpdate,
            ...manualUpdate
          },
          itemById: {
            ...classFeatures.itemById,
            ...itemById
          }
        }
      }

      if (actor.classes[actorClass].subclass) {
        const subClassName = actor.classes[actorClass].subclass.name;
        if (data[className][subClassName]) {
          const {
            addItems,
            removeItems,
            manualUpdate,
            itemById
          } = await searchItems(actor, data[className][subClassName], 'class', chrisClassFeaturesCompendium, laaruFeatsCompendium);
          classFeatures = {
            addItems: [
              ...classFeatures.addItems,
              ...addItems
            ],
            removeItems: [
              ...classFeatures.removeItems,
              ...removeItems
            ],
            manualUpdate: {
              ...classFeatures.manualUpdate,
              ...manualUpdate
            },
            itemById: {
              ...classFeatures.itemById,
              ...itemById
            }
          }
        }
      }
    }

  }
  return classFeatures;
}

export const searchItems = async (actor, items, searchType = 'feat', cprPack = chrisFeatsCompendium, laaruPack = laaruFeatsCompendium) => {
  if (actor.type === 'npc' && searchType !== 'spell') {
    return {...emptyResult};
  }
  let manualUpdate = {};
  const itemById = {};
  const addItems = [];
  const removeItems = [];
  for (const itemNameRu in items) {
    const itemData = items[itemNameRu];
    const actorItem = await actor.items.getName(itemNameRu);
    let laaruItem = await chris.getItemFromCompendium(laaruPack, itemNameRu, true);
    if (!laaruItem) {
      laaruItem = await chris.getItemFromCompendium(srdSpellCompendium, itemNameRu, true);
    }
    if (actorItem != null) {
      for (const item of itemData.items) {

        const {engName, ruName = '', ruDesc = ''} = item;
        // Work with single feat
        const chrisItem = await chris.getItemFromCompendium(cprPack, engName, true);
        const keepEngName = item.keepEngName || notSafeToRename[searchType].includes(engName);
        const newNameRu = searchType === 'spell' && itemNameRu.indexOf(' / ') !== -1 ? itemNameRu.split(' / ')[0].trim() : itemNameRu;


        const tmpItem = {
          ...chrisItem,
          name: keepEngName ? chrisItem.name : `${ruName !== '' ? ruName : newNameRu} / ${chrisItem.name}`,
          'system.description.value': updateDescription(ruDesc !== '' ? ruDesc : laaruItem, chrisItem, keepEngName),
          flags: {
            ...actorItem.flags,
            ...chrisItem.flags,
            [flagsName]: {
              oldId: actorItem.id,
              oldOwner: actor.id,
            }
          }
        };
        if (searchType === 'spell') {
          tmpItem['system.preparation.mode'] = actorItem.system.preparation.mode;
          tmpItem['system.preparation.value'] = actorItem.system.preparation.value;
        }
        if (itemData.pick) {
          if (!manualUpdate[`${itemNameRu}`]) {
            manualUpdate[`${itemNameRu}`] = {
              items: [],
            }
          }
          if (itemData.always && itemData.always.includes(chrisItem.name)) {
            addItems.push(tmpItem);
          } else {
            manualUpdate[`${itemNameRu}`].items.push(tmpItem);
          }
        } else {
          addItems.push(tmpItem);
          removeItems.push(actorItem.id);
        }
        itemById[tmpItem._id] = tmpItem;
      }
    }
  }

  return {
    addItems,
    removeItems,
    manualUpdate,
    itemById,
  };
}

export const searchSpells = async (actor, data) => {
  return await searchItems(actor, data, 'spell', chrisSpellsCompendium, laaruSpellsCompendium);
}

export const searchRaceFeatures = async (actor, data) => {
  if (actor.type === 'npc') {
    return {...emptyResult};
  }
  let raceFeatures = {};
  const race = actor.data.items.find(item => item.type === 'race');

  if (data[race?.name || '']) {
    raceFeatures = await searchItems(actor, data[race.name], 'race', chrisRaceFeaturesCompendium);
  }
  return raceFeatures
}
