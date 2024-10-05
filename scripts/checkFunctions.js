import {flagsName} from './consts.js'

const laaruFeatsCompendium = 'laaru-dnd5-hw.classfeatures';
const laaruSpellsCompendium = 'laaru-dnd5-hw.spells';
const chrisFeatsCompendium = 'chris-premades.CPRFeats';
const chrisClassFeaturesCompendium = 'chris-premades.CPRClassFeatures';
const chris3rdClassFeaturesCompendium = 'chris-premades.CPRThirdPartyClassFeatures';
const chrisRaceFeaturesCompendium = 'chris-premades.CPRRaceFeatures';
const chrisSpellsCompendium = 'chris-premades.CPRSpells';
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

const chrisCompendiumUtils = chrisPremades.utils.compendiumUtils;

const emptyResult = {
  addItems: [],
  removeItems: [],
  manualUpdate: {},
  itemById: {},
}

const updateDescription = (item1, item2, addName = false) => {
  let ruPart = typeof item1 === 'string' ? item1 : item1.system.description.value;
  if (addName) {
    ruPart = `<p><b>${item1.name}</b></p>${ruPart}`;
  }
  return `${ruPart} <hr /> ${item2.system.description.value}`
}

export const searchClassFeatures = async (actor, actorItems, chrisItems) => {
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

    if (chrisItems[className]) {
      if (chrisItems[className].base) {
        const {
          addItems,
          removeItems,
          manualUpdate,
          itemById
        } = await searchItems(actor, actorItems, chrisItems[className].base, 'class', chrisClassFeaturesCompendium, laaruFeatsCompendium);
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
        if (chrisItems[className][subClassName]) {
          const {
            addItems,
            removeItems,
            manualUpdate,
            itemById
          } = await searchItems(actor, actorItems, chrisItems[className][subClassName], 'class', chrisClassFeaturesCompendium, laaruFeatsCompendium);
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

export const searchItems = async (actor, actorItems, chrisItems, searchType = 'feat', cprPack = chrisFeatsCompendium, laaruPack = laaruFeatsCompendium) => {
  if (actor.type === 'npc' && searchType !== 'spell') {
    return {...emptyResult};
  }
  let manualUpdate = {};
  const itemById = {};
  const addItems = [];
  const removeItems = [];
  for (const actorItem of actorItems) {
    const itemNameRu = actorItem.name;
    const chrisItemData = chrisItems[itemNameRu];


    if (actorItem != null && chrisItemData != null) {
      for (const item of chrisItemData.items) {

        const {engName, ruName = '', ruDesc = ''} = item;
        let searchPack = cprPack;
        // Work with single feat
        if (engName.indexOf('Fighting Style') !== -1) {
          searchPack = chrisClassFeaturesCompendium;
        }

        let chrisItem = await chrisCompendiumUtils.getItemFromCompendium(searchPack, engName, {ignoreNotFound: true});
        if (!chrisItem && cprPack === chrisClassFeaturesCompendium) {
          chrisItem = await chrisCompendiumUtils.getItemFromCompendium(chris3rdClassFeaturesCompendium, engName, {ignoreNotFound: true});
        }
        if (!chrisItem) {
          console.error(`Item not found in ${cprPack}: ${engName}`);
          continue;
        }
        const keepEngName = item.keepEngName || notSafeToRename[searchType].includes(engName);
        const newNameRu = searchType === 'spell' && itemNameRu.indexOf(' / ') !== -1 ? itemNameRu.split(' / ')[0].trim() : itemNameRu;

        const tmpItem = {
          ...chrisItem,
          name: keepEngName ? chrisItem.name : `${ruName !== '' ? ruName : newNameRu} / ${chrisItem.name}`,
          system: {
            description: {
              value: updateDescription(ruDesc !== '' ? ruDesc : actorItem, chrisItem, keepEngName),
            }
          },
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
          tmpItem['system.level'] = actorItem.system.level;
          tmpItem['system.materials'] = actorItem.system.materials;
          tmpItem['system.properties'] = actorItem.system.properties;
          tmpItem['system.preparation.mode'] = actorItem.system.preparation.mode;
          tmpItem['system.preparation.prepared'] = actorItem.system.preparation.prepared;
        }
        if (chrisItemData.pick) {
          if (!manualUpdate[`${itemNameRu}`]) {
            manualUpdate[`${itemNameRu}`] = {
              items: [],
            }
          }
          if (chrisItem.always && chrisItem.always.includes(chrisItem.name)) {
            addItems.push(tmpItem);
          } else {
            manualUpdate[`${itemNameRu}`].items.push(tmpItem);
          }
        } else {
          addItems.push(tmpItem);
          removeItems.push(actorItem.id);
        }
        itemById[actorItem.id] = tmpItem;
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

export const searchSpells = async (actor, actorItems, data) => {
  return await searchItems(actor, actorItems, data, 'spell', chrisSpellsCompendium, laaruSpellsCompendium);
}

export const searchRaceFeatures = async (actor, actorItems, data) => {
  if (actor.type === 'npc') {
    return {...emptyResult};
  }
  let raceFeatures = {};
  const race = actor.items.find(item => item.type === 'race');

  if (data[race?.name || '']) {
    raceFeatures = await searchItems(actor, actorItems, data[race.name], 'race', chrisRaceFeaturesCompendium);
  }
  return raceFeatures
}
