import { RxJsonSchema, RxCollection, RxDocument } from 'rxdb';

export interface TierGroup {
  tier: string;
  items: string[];
}

export interface SortedListDocument {
  id: string;
  listName: string;
  items: string[];
  sortedItems?: string[];
  tieredItems?: TierGroup[];
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  userId: string;
  updatedAt: number;
}

export const sortedListSchema: RxJsonSchema<SortedListDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    listName: {
      type: 'string',
      maxLength: 200
    },
    items: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    sortedItems: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    tieredItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tier: {
            type: 'string'
          },
          items: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        },
        required: ['tier', 'items']
      }
    },
    completed: {
      type: 'boolean'
    },
    createdAt: {
      type: 'number'
    },
    completedAt: {
      type: 'number'
    },
    userId: {
      type: 'string',
      maxLength: 100
    },
    updatedAt: {
      type: 'number'
    }
  },
  required: ['id', 'listName', 'items', 'completed', 'createdAt', 'userId', 'updatedAt'],
  indexes: ['createdAt', 'userId', 'updatedAt']
};

export type SortedListDocumentMethods = Record<string, never>;

export type SortedListCollection = RxCollection<SortedListDocument, SortedListDocumentMethods>;

// Re-export for backward compatibility with existing code
export interface SortedList {
  _id?: string;
  _rev?: string;
  listName: string;
  items: string[];
  sortedItems?: string[];
  tieredItems?: TierGroup[];
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}
