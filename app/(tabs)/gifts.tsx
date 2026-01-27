import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ImageSourcePropType,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GiftItem {
  id: string;
  title: string;
  sku: string;
  link: string;
  celebrations: string[];
  cover?: ImageSourcePropType;
  price?: number;
  originalPrice?: number;
  salePrice?: number;
  available?: boolean;
}

const CATEGORY_FILTERS = [
  'Все',
  'Будущим мамам',
  'В подарок',
  'Для новорождённых',
  'Для семьи',
  'Для девочек',
  'Молодожёнам',
  'Для детей',
] as const;

type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

// Типы обложек
type CoverType = 'all' | 'hard' | 'soft';

// Типы регионов
type Region = 'belarus' | 'russia' | 'kazakhstan';

const REGIONS: { value: Region; label: string }[] = [
  { value: 'belarus', label: 'Беларусь' },
  { value: 'russia', label: 'Россия' },
  { value: 'kazakhstan', label: 'Казахстан' },
];

// Функция определения типа обложки из названия
const getCoverType = (title: string): 'hard' | 'soft' | null => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('твердой обложке') || lowerTitle.includes('твердой')) {
    return 'hard';
  }
  if (lowerTitle.includes('мягкой обложке') || lowerTitle.includes('мягкой')) {
    return 'soft';
  }
  return null;
};

// Маппинг старых названий на новые категории для обратной совместимости
const CELEBRATION_MAPPING: Record<string, string> = {
  'Беременность': 'Будущим мамам',
  'Выписка': 'Для новорождённых',
  'Первый год': 'Для новорождённых',
  'День рождения': 'В подарок',
  'Молодожёнам': 'Молодожёнам',
};

// Маппинг SKU на категории для специальных случаев
const SKU_TO_CATEGORY: Record<string, string> = {
  // Личные дневники для девочки (DD1-DD21)
  'DD1': 'Для девочек',
  'DD2': 'Для девочек',
  'DD3': 'Для девочек',
  'DD4': 'Для девочек',
  'DD5': 'Для девочек',
  'DD6': 'Для девочек',
  'DD7': 'Для девочек',
  'DD8': 'Для девочек',
  'DD9': 'Для девочек',
  'DD10': 'Для девочек',
  'DD11': 'Для девочек',
  'DD12': 'Для девочек',
  'DD13': 'Для девочек',
  'DD14': 'Для девочек',
  'DD15': 'Для девочек',
  'DD16': 'Для девочек',
  'DD17': 'Для девочек',
  'DD18': 'Для девочек',
  'DD20': 'Для девочек',
  'DD21': 'Для девочек',
};

export const COVER_BY_SKU: Record<string, ImageSourcePropType> = {
  DB1: require('../../assets/images/albums/DB1_0.png'),
  DB2: require('../../assets/images/albums/DB2_0.png'),
  DB3: require('../../assets/images/albums/DB3_0.png'),
  DB4: require('../../assets/images/albums/DB4_0.png'),
  DB5: require('../../assets/images/albums/DB5_0.png'),
  EB1: require('../../assets/images/albums/DB1_п.png'),
  EB2: require('../../assets/images/albums/DB2_п.png'),
  EB3: require('../../assets/images/albums/DB3_п.png'),
  EB4: require('../../assets/images/albums/DB4_п.png'),
  EB5: require('../../assets/images/albums/DB5_п.png'),
  DFA5: require('../../assets/images/albums/DFA5.png'),
  DFA7: require('../../assets/images/albums/DFA7.png'),
  DFA8: require('../../assets/images/albums/DFA8.png'),
  DFA9: require('../../assets/images/albums/DFA9.png'),
  DFA14: require('../../assets/images/albums/DFA14.png'),
  DFA15: require('../../assets/images/albums/DFA15.png'),
  DFA16: require('../../assets/images/albums/DFA16.png'),
  DFA19: require('../../assets/images/albums/DFA19.png'),
  DFA21: require('../../assets/images/albums/DFA21.png'),
  DFA23: require('../../assets/images/albums/DFA23.png'),
  DFA24: require('../../assets/images/albums/DFA24.png'),
  DFA25: require('../../assets/images/albums/DFA25.png'),
  DFA26: require('../../assets/images/albums/DFA26.png'),
  DFA27: require('../../assets/images/albums/DFA27.png'),
  DFA28: require('../../assets/images/albums/DFA28.png'),
  DFA29: require('../../assets/images/albums/DFA29.png'),
  DFA31: require('../../assets/images/albums/DFA31.png'),
  DFA46: require('../../assets/images/albums/DFA46.png'),
  DFA47: require('../../assets/images/albums/DFA47.png'),
  DFA50: require('../../assets/images/albums/DFA50.png'),
  DFA52: require('../../assets/images/albums/DFA52.png'),
  DFA53: require('../../assets/images/albums/DFA53.png'),
  DFA57: require('../../assets/images/albums/DFA57.png'),
  DFA59: require('../../assets/images/albums/DFA59.png'),
  DFA60: require('../../assets/images/albums/DFA60.png'),
  DFA71: require('../../assets/images/albums/DFA71.png'),
  DFA72: require('../../assets/images/albums/DFA72.png'),
  DFA74: require('../../assets/images/albums/DFA74.png'),
  DFA300: require('../../assets/images/albums/DFA300.png'),
  DFA301: require('../../assets/images/albums/DFA301.png'),
  DFA302: require('../../assets/images/albums/DFA302.png'),
  DFA304: require('../../assets/images/albums/DFA304.png'),
  DFA305: require('../../assets/images/albums/DFA305.png'),
  DFA306: require('../../assets/images/albums/DFA306.png'),
  DFA307: require('../../assets/images/albums/DFA307.png'),
  DFA308: require('../../assets/images/albums/DFA308.png'),
  'DFA309 (2)': require('../../assets/images/albums/DFA309 (2).png'),
  DFA207: require('../../assets/images/albums/DFA207.png'),
  DFA208: require('../../assets/images/albums/DFA208.png'),
  // Личные дневники для девочки большой
  DD1: require('../../assets/images/albums/DD_1.png'),
  DD2: require('../../assets/images/albums/DD_2.png'),
  DD3: require('../../assets/images/albums/DD_3.png'),
  DD4: require('../../assets/images/albums/DD_4.png'),
  DD5: require('../../assets/images/albums/DD_5.png'),
  DD6: require('../../assets/images/albums/DD_6.png'),
  DD7: require('../../assets/images/albums/DD_7.png'),
  DD8: require('../../assets/images/albums/DD_8.png'),
  DD9: require('../../assets/images/albums/DD_9.png'),
  DD10: require('../../assets/images/albums/DD_10.png'),
  DD11: require('../../assets/images/albums/DD_11.png'),
  DD12: require('../../assets/images/albums/DD_12.png'),
  DD13: require('../../assets/images/albums/DD_13.png'),
  DD14: require('../../assets/images/albums/DD_14.png'),
  DD15: require('../../assets/images/albums/DD_15.png'),
  DD16: require('../../assets/images/albums/DD_16.png'),
  DD17: require('../../assets/images/albums/DD_17.png'),
  DD18: require('../../assets/images/albums/DD_18.png'),
  DD20: require('../../assets/images/albums/DD_20.png'),
  DD21: require('../../assets/images/albums/DD_21.png'),
  // Фотоальбомы свадебные
  SVA2W: require('../../assets/images/albums/SVA_2.png'),
  SVA3W: require('../../assets/images/albums/SVA_3.png'),
  SVA5W: require('../../assets/images/albums/SVA_5.png'),
  SVA7W: require('../../assets/images/albums/SVA_7.png'),
  SVA9W: require('../../assets/images/albums/SVA_9.png'),
};

export const GIFT_ITEMS: GiftItem[] = [
  {
    id: 'DB5',
    title: 'Дневник беременности в твердой обложке',
    sku: 'DB5',
    link: 'https://www.wildberries.ru/catalog/152139943/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.DB5,
  },
    {
    id: 'DB1',
    title: 'Дневник беременности в твердой обложке',
    sku: 'DB1',
    link: 'https://www.wildberries.ru/catalog/66837050/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.DB1,
  },
  {
    id: 'DB4',
    title: 'Дневник беременности в твердой обложке',
    sku: 'DB4',
    link: 'https://www.wildberries.ru/catalog/138618608/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.DB4,
  },
  {
    id: 'DB6',
    title: 'Дневник беременности в твердой обложке',
    sku: 'DB6',
    link: 'https://www.wildberries.ru/catalog/256087147/detail.aspx',
    celebrations: ['Беременность'],
  },
  {
    id: 'DB3',
    title: 'Дневник беременности в твердой обложке',
    sku: 'DB3',
    link: 'https://www.wildberries.ru/catalog/138618607/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.DB3,
  },
  {
    id: 'DB2',
    title: 'Дневник беременности в твердой обложке',
    sku: 'DB2',
    link: 'https://www.wildberries.ru/catalog/86132045/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.DB2,
  },
  {
    id: 'EB4',
    title: 'Дневник беременности А5 в мягкой обложке',
    sku: 'EB4',
    link: 'https://www.wildberries.ru/catalog/152684881/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.EB4,
  },
  {
    id: 'EB5',
    title: 'Дневник беременности А5 в мягкой обложке',
    sku: 'EB5',
    link: 'https://www.wildberries.ru/catalog/152685211/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.EB5,
  },
  {
    id: 'EB1',
    title: 'Дневник беременности А5 в мягкой обложке',
    sku: 'EB1',
    link: 'https://www.wildberries.ru/catalog/139354577/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.EB1,
  },
  {
    id: 'EB3',
    title: 'Дневник беременности А5 в мягкой обложке',
    sku: 'EB3',
    link: 'https://www.wildberries.ru/catalog/152684880/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.EB3,
  },
  {
    id: 'EB2',
    title: 'Дневник беременности А5 в мягкой обложке',
    sku: 'EB2',
    link: 'https://www.wildberries.ru/catalog/139354578/detail.aspx',
    celebrations: ['Беременность'],
    cover: COVER_BY_SKU.EB2,
  },
  {
    id: 'DFA50',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA50',
    link: 'https://www.wildberries.ru/catalog/98799458/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA50,
  },
  {
    id: 'DFA301',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA301',
    link: 'https://www.wildberries.ru/catalog/163788083/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA301,
  },
  {
    id: 'DFA303',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA303',
    link: 'https://www.wildberries.ru/catalog/163788085/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
  },
  {
    id: 'DFA308',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA308',
    link: 'https://www.wildberries.ru/catalog/163788090/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA308,
  },
  {
    id: 'DFA7',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA7',
    link: 'https://www.wildberries.ru/catalog/66846346/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA7,
  },
  {
    id: 'DFA302',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA302',
    link: 'https://www.wildberries.ru/catalog/163788084/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA302,
  },
  {
    id: 'DFA16',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA16',
    link: 'https://www.wildberries.ru/catalog/66849999/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA16,
  },
  {
    id: 'DFA305',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA305',
    link: 'https://www.wildberries.ru/catalog/163788087/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA305,
  },
  {
    id: 'DFA300',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA300',
    link: 'https://www.wildberries.ru/catalog/163788082/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA300,
  },
  {
    id: 'DFA304',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA304',
    link: 'https://www.wildberries.ru/catalog/163788086/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA304,
    },
    {
    id: 'DFA307',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA307',
    link: 'https://www.wildberries.ru/catalog/163788089/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA307,
  },
  {
    id: 'DFA19',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA19',
    link: 'https://www.wildberries.ru/catalog/67590318/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA19,
  },
  {
    id: 'DFA306',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA306',
    link: 'https://www.wildberries.ru/catalog/163788088/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA306,
  },
  {
    id: 'DFA5',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA5',
    link: 'https://www.wildberries.ru/catalog/66839575/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA5,
  },
  {
    id: 'DFA23',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA23',
    link: 'https://www.wildberries.ru/catalog/67778270/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA23,
  },
  {
    id: 'DFA53',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA53',
    link: 'https://www.wildberries.ru/catalog/98799449/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA53,
  },
  {
    id: 'DFA71',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA71',
    link: 'https://www.wildberries.ru/catalog/147788433/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA71,
  },
  {
    id: 'DFA309',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA309',
    link: 'https://www.wildberries.ru/catalog/179071041/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU['DFA309 (2)'],
  },
  {
    id: 'DFA14',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA14',
    link: 'https://www.wildberries.ru/catalog/66847721/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA14,
  },
  {
    id: 'DFA72',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA72',
    link: 'https://www.wildberries.ru/catalog/147788434/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA72,
  },
  {
    id: 'DFA25',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA25',
    link: 'https://www.wildberries.ru/catalog/68981722/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA25,
  },
  {
    id: 'DFA26',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA26',
    link: 'https://www.wildberries.ru/catalog/68981767/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA26,
  },
  {
    id: 'DFA27',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA27',
    link: 'https://www.wildberries.ru/catalog/68981905/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA27,
  },
  {
    id: 'DFA46',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA46',
    link: 'https://www.wildberries.ru/catalog/98799448/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA46,
  },
  {
    id: 'DFA60',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA60',
    link: 'https://www.wildberries.ru/catalog/123041073/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA60,
  },
  {
    id: 'DFA59',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA59',
    link: 'https://www.wildberries.ru/catalog/123041074/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA59,
  },
  {
    id: 'DFA74',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA74',
    link: 'https://www.wildberries.ru/catalog/147788437/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA74,
  },
  {
    id: 'DFA205',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA205',
    link: 'https://www.wildberries.ru/catalog/161331923/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
  },
  {
    id: 'DFA8',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA8',
    link: 'https://www.wildberries.ru/catalog/66846523/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA8,
  },
  {
    id: 'DFA9',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA9',
    link: 'https://www.wildberries.ru/catalog/66846680/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA9,
  },
  {
    id: 'DFA15',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA15',
    link: 'https://www.wildberries.ru/catalog/66848687/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA15,
  },
  {
    id: 'DFA21',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA21',
    link: 'https://www.wildberries.ru/catalog/67591536/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA21,
  },
  {
    id: 'DFA24',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA24',
    link: 'https://www.wildberries.ru/catalog/68981294/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA24,
  },
  {
    id: 'DFA28',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA28',
    link: 'https://www.wildberries.ru/catalog/68981988/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA28,
  },
  {
    id: 'DFA29',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA29',
    link: 'https://www.wildberries.ru/catalog/68982151/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA29,
  },
  {
    id: 'DFA31',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA31',
    link: 'https://www.wildberries.ru/catalog/68982845/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA31,
  },
  {
    id: 'DFA43',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA43',
    link: 'https://www.wildberries.ru/catalog/68995270/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
  },
  {
    id: 'DFA52',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA52',
    link: 'https://www.wildberries.ru/catalog/98799453/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA52,
  },
  {
    id: 'DFA57',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA57',
    link: 'https://www.wildberries.ru/catalog/102484739/detail.aspx',
    celebrations: ['Первый год', 'День рождения'],
    cover: COVER_BY_SKU.DFA57,
  },
  {
    id: 'DFA206',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA206',
    link: 'https://www.wildberries.ru/catalog/161331924/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
  },
  {
    id: 'DFA207',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA207',
    link: 'https://www.wildberries.ru/catalog/161331925/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA207,
    },
  {
    id: 'DFA208',
    title: 'Фотоальбом от 0 до 1 года',
    sku: 'DFA208',
    link: 'https://www.wildberries.ru/catalog/161331926/detail.aspx',
    celebrations: ['Первый год', 'Выписка'],
    cover: COVER_BY_SKU.DFA208,
  },
  // Личные дневники для девочки большой
  {
    id: 'DD1',
    title: 'Личный дневник для девочки большой',
    sku: 'DD1',
    link: 'https://www.wildberries.ru/catalog/111247392/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD1,
  },
  {
    id: 'DD2',
    title: 'Личный дневник для девочки большой',
    sku: 'DD2',
    link: 'https://www.wildberries.ru/catalog/111251934/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD2,
  },
  {
    id: 'DD3',
    title: 'Личный дневник для девочки большой',
    sku: 'DD3',
    link: 'https://www.wildberries.ru/catalog/111254142/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD3,
  },
  {
    id: 'DD4',
    title: 'Личный дневник для девочки большой',
    sku: 'DD4',
    link: 'https://www.wildberries.ru/catalog/111256264/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD4,
  },
  {
    id: 'DD5',
    title: 'Личный дневник для девочки большой',
    sku: 'DD5',
    link: 'https://www.wildberries.ru/catalog/111938191/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD5,
  },
  {
    id: 'DD6',
    title: 'Личный дневник для девочки большой',
    sku: 'DD6',
    link: 'https://www.wildberries.ru/catalog/111939065/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD6,
  },
  {
    id: 'DD7',
    title: 'Личный дневник для девочки большой',
    sku: 'DD7',
    link: 'https://www.wildberries.ru/catalog/111941905/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD7,
  },
  {
    id: 'DD8',
    title: 'Личный дневник для девочки большой',
    sku: 'DD8',
    link: 'https://www.wildberries.ru/catalog/111942486/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD8,
  },
  {
    id: 'DD9',
    title: 'Личный дневник для девочки большой',
    sku: 'DD9',
    link: 'https://www.wildberries.ru/catalog/117921907/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD9,
  },
  {
    id: 'DD10',
    title: 'Личный дневник для девочки большой',
    sku: 'DD10',
    link: 'https://www.wildberries.ru/catalog/117921862/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD10,
  },
  {
    id: 'DD11',
    title: 'Личный дневник для девочки большой',
    sku: 'DD11',
    link: 'https://www.wildberries.ru/catalog/117962020/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD11,
  },
  {
    id: 'DD12',
    title: 'Личный дневник для девочки большой',
    sku: 'DD12',
    link: 'https://www.wildberries.ru/catalog/117962877/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD12,
  },
  {
    id: 'DD13',
    title: 'Личный дневник для девочки большой',
    sku: 'DD13',
    link: 'https://www.wildberries.ru/catalog/158114885/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD13,
  },
  {
    id: 'DD14',
    title: 'Личный дневник для девочки большой',
    sku: 'DD14',
    link: 'https://www.wildberries.ru/catalog/158114880/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD14,
  },
  {
    id: 'DD15',
    title: 'Личный дневник для девочки большой',
    sku: 'DD15',
    link: 'https://www.wildberries.ru/catalog/158114881/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD15,
  },
  {
    id: 'DD16',
    title: 'Личный дневник для девочки большой',
    sku: 'DD16',
    link: 'https://www.wildberries.ru/catalog/158114882/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD16,
  },
  {
    id: 'DD17',
    title: 'Личный дневник для девочки большой',
    sku: 'DD17',
    link: 'https://www.wildberries.ru/catalog/158114886/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD17,
  },
  {
    id: 'DD18',
    title: 'Личный дневник для девочки большой',
    sku: 'DD18',
    link: 'https://www.wildberries.ru/catalog/158114887/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD18,
  },
  {
    id: 'DD20',
    title: 'Личный дневник для девочки большой',
    sku: 'DD20',
    link: 'https://www.wildberries.ru/catalog/158114884/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD20,
  },
  {
    id: 'DD21',
    title: 'Личный дневник для девочки большой',
    sku: 'DD21',
    link: 'https://www.wildberries.ru/catalog/158114888/detail.aspx',
    celebrations: ['День рождения'],
    cover: COVER_BY_SKU.DD21,
  },
  // Фотоальбомы свадебные
  {
    id: 'SVA2W',
    title: 'Фотоальбом свадебный 18х24 см',
    sku: 'SVA2W',
    link: 'https://www.wildberries.ru/catalog/176756901/detail.aspx',
    celebrations: ['Молодожёнам'],
    cover: COVER_BY_SKU.SVA2W,
  },
  {
    id: 'SVA3W',
    title: 'Фотоальбом свадебный 18х24 см',
    sku: 'SVA3W',
    link: 'https://www.wildberries.ru/catalog/176757216/detail.aspx',
    celebrations: ['Молодожёнам'],
    cover: COVER_BY_SKU.SVA3W,
  },
  {
    id: 'SVA5W',
    title: 'Фотоальбом свадебный 21х21 см',
    sku: 'SVA5W',
    link: 'https://www.wildberries.ru/catalog/176933757/detail.aspx',
    celebrations: ['Молодожёнам'],
    cover: COVER_BY_SKU.SVA5W,
  },
  {
    id: 'SVA7W',
    title: 'Фотоальбом свадебный 18х24 см',
    sku: 'SVA7W',
    link: 'https://www.wildberries.ru/catalog/176757494/detail.aspx',
    celebrations: ['Молодожёнам'],
    cover: COVER_BY_SKU.SVA7W,
  },
  {
    id: 'SVA9W',
    title: 'Фотоальбом свадебный 18х24 см',
    sku: 'SVA9W',
    link: 'https://www.wildberries.ru/catalog/176933371/detail.aspx',
    celebrations: ['Молодожёнам'],
    cover: COVER_BY_SKU.SVA9W,
  },
];

export default function GiftsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] =
    useState<CategoryFilter>('Все');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter | null>(null);
  const [selectedCoverType, setSelectedCoverType] = useState<CoverType>('all');
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [isLoadingRegion, setIsLoadingRegion] = useState(true);

  const opacity = useSharedValue(0);

  // Предзагрузка всех изображений подарков при монтировании и фокусе экрана
  useFocusEffect(
    React.useCallback(() => {
      const preloadGiftImages = async () => {
        try {
          // Собираем все уникальные изображения из COVER_BY_SKU
          const imageAssets = Object.values(COVER_BY_SKU);
          
          // Предзагружаем только строковые URI (локальные ресурсы не требуют предзагрузки)
          await Promise.all(
            imageAssets.map(imageSource => {
              if (typeof imageSource === 'string') {
                return Image.prefetch(imageSource).catch(err => {
                  console.warn('⚠️ Ошибка предзагрузки изображения подарка:', err);
                });
              }
              // Пропускаем локальные ресурсы (числа) - они загружаются быстро
              return Promise.resolve();
            })
          );
          
          console.log('✅ Все изображения подарков предзагружены');
        } catch (error) {
          console.error('❌ Ошибка предзагрузки изображений подарков:', error);
          // В случае ошибки изображения все равно будут загружаться по требованию
        }
      };

      // Запускаем предзагрузку сразу при фокусе экрана
      preloadGiftImages();
    }, [])
  );

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350 });
  }, [opacity]);

  // Загружаем сохраненный регион при монтировании
  useEffect(() => {
    const loadRegion = async () => {
      try {
        const savedRegion = await AsyncStorage.getItem('@user_region');
        if (savedRegion) {
          setSelectedRegion(savedRegion as Region);
          setIsLoadingRegion(false);
        } else {
          // Если регион не выбран, показываем модальное окно
          setIsLoadingRegion(false);
          setShowRegionModal(true);
        }
      } catch (error) {
        console.error('Error loading region:', error);
        setIsLoadingRegion(false);
        setShowRegionModal(true);
      }
    };
    loadRegion();
  }, []);

  // Сохраняем выбранный регион
  const handleRegionSelect = async (region: Region) => {
    try {
      await AsyncStorage.setItem('@user_region', region);
      setSelectedRegion(region);
      setShowRegionModal(false);
    } catch (error) {
      console.error('Error saving region:', error);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleChangeSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSelectCategory = useCallback((filter: CategoryFilter) => {
    setActiveCategory(filter);
  }, []);

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Не удалось открыть ссылку:', error);
    }
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    // Определяем категорию для фильтрации (приоритет у расширенного поиска)
    const filterCategory = selectedCategory || (activeCategory === 'Все' ? null : activeCategory);
    
    return GIFT_ITEMS.filter(item => {
      // Фильтр по поисковому запросу
      const matchesSearch =
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.sku.toLowerCase().includes(normalizedQuery);
      if (!matchesSearch) {
        return false;
      }
      
      // Фильтр по категории (если выбрана)
      if (filterCategory) {
        // Проверяем специальный маппинг по SKU (для "Для девочек")
        const skuCategory = SKU_TO_CATEGORY[item.sku];
        if (skuCategory === filterCategory) {
          // Продолжаем проверку типа обложки
        } else {
          // Маппинг категорий на старые названия celebrations
          const categoryToCelebrations: Record<string, string[]> = {
            'Будущим мамам': ['Беременность'],
            'В подарок': ['День рождения'],
            'Для новорождённых': ['Выписка', 'Первый год'],
            'Молодожёнам': ['Молодожёнам'], // Свадебные товары
          };
          
          // Для категории "Молодожёнам" проверяем свадебные товары (SVA) или celebrations
          if (filterCategory === 'Молодожёнам') {
            const matches = item.sku.startsWith('SVA') || item.celebrations.includes('Молодожёнам');
            if (!matches) return false;
          } else if (filterCategory === 'В подарок') {
            // Для категории "В подарок" исключаем дневники для девочек (DD1-DD21)
            const isGirlsDiary = SKU_TO_CATEGORY[item.sku] === 'Для девочек';
            const matches = item.celebrations.includes('День рождения') && !isGirlsDiary;
            if (!matches) return false;
          } else {
            // Для остальных категорий проверяем через маппинг
            const celebrationsToMatch = categoryToCelebrations[filterCategory] || [];
            if (celebrationsToMatch.length > 0) {
              const matches = item.celebrations.some(celeb => celebrationsToMatch.includes(celeb));
              if (!matches) return false;
            } else {
              // Для категорий "Для семьи" и "Для детей" пока возвращаем false
              if (filterCategory === 'Для семьи' || filterCategory === 'Для детей') {
                return false;
              }
            }
          }
        }
      }
      
      // Фильтр по типу обложки
      if (selectedCoverType !== 'all') {
        const coverType = getCoverType(item.title);
        if (selectedCoverType === 'hard') {
          if (coverType !== 'hard') return false;
        } else if (selectedCoverType === 'soft') {
          if (coverType !== 'soft') return false;
        }
      }
      
      return true;
    });
  }, [searchQuery, activeCategory, selectedCategory, selectedCoverType]);

  // Предзагрузка изображений для отфильтрованных элементов при смене фильтра
  useEffect(() => {
    const preloadFilteredImages = async () => {
      try {
        // Собираем изображения только для отфильтрованных элементов
        const imagesToPreload = filteredItems
          .filter(item => item.cover)
          .map(item => item.cover!);

        // Предзагружаем только строковые URI (локальные ресурсы не требуют предзагрузки)
        await Promise.all(
          imagesToPreload.map(imageSource => {
            if (typeof imageSource === 'string') {
              return Image.prefetch(imageSource).catch(err => {
                console.warn('⚠️ Ошибка предзагрузки изображения отфильтрованного подарка:', err);
              });
            }
            // Пропускаем локальные ресурсы (числа) - они загружаются быстро
            return Promise.resolve();
          })
        );
      } catch (error) {
        // Игнорируем ошибки, изображения загрузятся по требованию
      }
    };

    preloadFilteredImages();
  }, [filteredItems]);

  const renderFilter = useCallback(
    (filter: CategoryFilter) => {
      const isActive = filter === activeCategory;
      return (
        <Pressable
          key={filter}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
          accessibilityLabel={`Категория ${filter}`}
          style={({ pressed }) => [
            styles.categoryFilterButton,
            isActive && styles.categoryFilterButtonActive,
            pressed && styles.categoryFilterButtonPressed,
          ]}
          onPress={() => handleSelectCategory(filter)}
        >
          <Text
            style={[
              styles.filterButtonText,
              isActive && styles.filterButtonTextActive,
            ]}
          >
            {filter}
          </Text>
        </Pressable>
      );
    },
    [activeCategory, handleSelectCategory]
  );

  // Функция для получения цены в зависимости от региона
  const getPriceForRegion = useCallback((item: GiftItem): number | null => {
    if (!selectedRegion || !item.price) return null;
    
    // Здесь можно добавить логику конвертации цен для разных регионов
    // Пока возвращаем базовую цену
    return item.price;
  }, [selectedRegion]);

  const renderItem = useCallback(
    ({ item, index }: { item: GiftItem; index: number }) => {
      // Используем high priority для видимых элементов (первые 10)
      const imagePriority = index < 10 ? 'high' : 'normal';
      const price = getPriceForRegion(item);
      
      return (
        <View style={styles.card} accessible>
          <View style={styles.coverWrapper}>
            {item.cover ? (
              <Image
                source={item.cover}
                style={styles.coverImage}
                contentFit="contain"
                priority={imagePriority}
                cachePolicy="disk"
                transition={0}
                fadeDuration={0}
                accessibilityLabel={`Обложка товара ${item.title}`}
                placeholderContentFit="contain"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={40} color="#D4C4B5" />
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {price !== null && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>
                  {price.toLocaleString('ru-RU')} {selectedRegion === 'belarus' ? 'BYN' : selectedRegion === 'kazakhstan' ? '₸' : '₽'}
                </Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.buyButton,
                pressed && styles.buyButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Перейти на Wildberries для товара ${item.title}`}
              accessibilityHint="Откроется карточка товара на Wildberries"
              onPress={() => handleOpenLink(item.link)}
            >
              <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buyButtonText}>Купить на Wildberries</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [handleOpenLink, getPriceForRegion, selectedRegion]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            Каталог
            {(selectedCategory !== null || selectedCoverType !== 'all') && (
              <Text style={styles.titleCount}> ({filteredItems.length})</Text>
            )}
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={18} color="#9B8E7F" />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по названию или артикулу"
              placeholderTextColor="#C7BBB0"
              value={searchQuery}
              onChangeText={handleChangeSearch}
              returnKeyType="search"
              accessibilityLabel="Поиск подарков"
              accessibilityHint="Введите название товара или артикул"
            />
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Расширенный поиск"
          >
            <Ionicons 
              name="filter-outline" 
              size={20} 
              color={(selectedCategory !== null || selectedCoverType !== 'all') ? '#C9A89A' : '#9B8E7F'} 
            />
            {(selectedCategory !== null || selectedCoverType !== 'all') && (
              <View style={styles.filterActiveIndicator} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.filtersRow}>
          <FlatList
            horizontal
            data={CATEGORY_FILTERS}
            renderItem={({ item }) => renderFilter(item)}
            keyExtractor={item => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          />
        </View>

        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          // Оптимизации для производительности
          removeClippedSubviews={true}
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          getItemLayout={(data, index) => {
            // Высота карточки: coverWrapper (280) + cardContent padding (40) + title (~30) + gap (12) + button (~56) + gap между карточками (20)
            const itemHeight = 280 + 40 + 30 + 12 + 56 + 20; // ~438px
            return {
              length: itemHeight,
              offset: itemHeight * index,
              index,
            };
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={64} color="#D4C4B5" />
              <Text style={styles.emptyStateText}>
                Подходящие подарки не найдены. Попробуйте изменить запрос.
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* Модальное окно расширенного поиска */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Расширенный поиск</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8B6F5F" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Фильтр по разделу */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Раздел</Text>
                <View style={styles.filterOptions}>
                  {CATEGORY_FILTERS.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.filterOption,
                        selectedCategory === category && styles.filterOptionSelected,
                      ]}
                      onPress={() => setSelectedCategory(category === 'Все' ? null : category)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedCategory === category && styles.filterOptionTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                      {selectedCategory === category && (
                        <Ionicons name="checkmark-circle" size={20} color="#C9A89A" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Фильтр по типу обложки */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Тип обложки</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedCoverType === 'all' && styles.filterOptionSelected,
                    ]}
                    onPress={() => setSelectedCoverType('all')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedCoverType === 'all' && styles.filterOptionTextSelected,
                      ]}
                    >
                      Все
                    </Text>
                    {selectedCoverType === 'all' && (
                      <Ionicons name="checkmark-circle" size={20} color="#C9A89A" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedCoverType === 'hard' && styles.filterOptionSelected,
                    ]}
                    onPress={() => setSelectedCoverType('hard')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedCoverType === 'hard' && styles.filterOptionTextSelected,
                      ]}
                    >
                      Твердая обложка
                    </Text>
                    {selectedCoverType === 'hard' && (
                      <Ionicons name="checkmark-circle" size={20} color="#C9A89A" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedCoverType === 'soft' && styles.filterOptionSelected,
                    ]}
                    onPress={() => setSelectedCoverType('soft')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedCoverType === 'soft' && styles.filterOptionTextSelected,
                      ]}
                    >
                      Мягкая обложка
                    </Text>
                    {selectedCoverType === 'soft' && (
                      <Ionicons name="checkmark-circle" size={20} color="#C9A89A" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Кнопки действий */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedCategory(null);
                  setSelectedCoverType('all');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.resetButtonText}>Сбросить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.applyButtonText}>Применить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно выбора региона */}
      <Modal
        visible={showRegionModal && !isLoadingRegion}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.regionModalOverlay}>
          <View style={styles.regionModalContent}>
            <View style={styles.regionModalHeader}>
              <Text style={styles.regionModalTitle}>Выберите регион</Text>
            </View>

            <Text style={styles.regionModalDescription}>
              Выберите ваш регион для отображения актуальных цен
            </Text>

            <View style={styles.regionOptions}>
              {REGIONS.map((region) => (
                <TouchableOpacity
                  key={region.value}
                  style={[
                    styles.regionOption,
                    selectedRegion === region.value && styles.regionOptionSelected,
                  ]}
                  onPress={() => handleRegionSelect(region.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.regionOptionText,
                      selectedRegion === region.value && styles.regionOptionTextSelected,
                    ]}
                  >
                    {region.label}
                  </Text>
                  {selectedRegion === region.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#C9A89A" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
  },
  titleCount: {
    fontSize: 20,
    color: '#C9A89A',
    fontStyle: 'normal',
  },
  searchContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterActiveIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9A89A',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#6F5A4F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  filtersRow: {
    marginTop: 12,
  },
  filtersContent: {
    gap: 12,
    paddingVertical: 4,
  },
  categoryFilterButton: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E6DBD1',
    backgroundColor: '#FFFFFF',
  },
  categoryFilterButtonActive: {
    backgroundColor: '#C9A89A',
    borderColor: '#C9A89A',
  },
  categoryFilterButtonPressed: {
    opacity: 0.8,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E0',
  },
  modalTitle: {
    fontSize: 24,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  filterSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 16,
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F0E8E0',
  },
  filterOptionSelected: {
    backgroundColor: '#FAF8F5',
    borderColor: '#C9A89A',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
    flex: 1,
  },
  filterOptionTextSelected: {
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0E8E0',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#C9A89A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 24,
    paddingBottom: 40,
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F0EB',
    overflow: 'hidden',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  coverWrapper: {
    height: 280,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    lineHeight: 24,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: '#C9A89A',
    paddingVertical: 14,
  },
  buyButtonPressed: {
    opacity: 0.85,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  priceContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 20,
    color: '#C9A89A',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  regionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  regionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  regionModalHeader: {
    marginBottom: 16,
  },
  regionModalTitle: {
    fontSize: 24,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    textAlign: 'center',
  },
  regionModalDescription: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  regionOptions: {
    gap: 12,
  },
  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#F0E8E0',
  },
  regionOptionSelected: {
    backgroundColor: '#FAF8F5',
    borderColor: '#C9A89A',
  },
  regionOptionText: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '400',
    flex: 1,
  },
  regionOptionTextSelected: {
    fontWeight: '600',
  },
});
