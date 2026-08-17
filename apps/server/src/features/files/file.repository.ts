import { FileModel, toStoredFile } from './file.model.js';
import type { NewFileRecord, StoredFile } from './file.types.js';

export interface FileRepository {
  /**
   * Writes the index row, or returns the one that is already there.
   *
   * Never throws on a duplicate. `pathname` is unique, so a second confirmation of the same
   * upload finds the existing row and hands it back — which is what makes the browser free to
   * retry a confirmation it is not sure landed.
   */
  record(record: NewFileRecord): Promise<StoredFile>;
  listForProject(projectId: string): Promise<readonly StoredFile[]>;
  findById(id: string): Promise<StoredFile | null>;
  remove(id: string): Promise<void>;
  /** How many files are attached to one task. Read by the rule that "done" needs evidence. */
  countForTask(taskId: string): Promise<number>;
}

export interface MongoFileRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** MongoDB's duplicate-key code. The one error here that is a normal outcome. */
const DUPLICATE_KEY = 11000;

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === DUPLICATE_KEY
  );
}

export function createMongoFileRepository(
  dependencies: MongoFileRepositoryDependencies,
): FileRepository {
  const { connect } = dependencies;

  return {
    async record(record) {
      await connect();

      try {
        const document = await FileModel.create(record);
        return toStoredFile(document.toObject());
      } catch (error) {
        if (!isDuplicateKey(error)) throw error;

        /*
         * Somebody already recorded this exact blob. Return theirs rather than failing: the
         * caller asked for the file to be on the project, and it is.
         */
        const existing = await FileModel.findOne({ pathname: record.pathname }).lean().exec();
        if (!existing) throw error;

        return toStoredFile(existing);
      }
    },

    async listForProject(projectId) {
      await connect();
      const documents = await FileModel.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean()
        .exec();
      return documents.map(toStoredFile);
    },

    async findById(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await FileModel.findById(id).lean().exec();
      return document ? toStoredFile(document) : null;
    },

    async remove(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return;
      await FileModel.deleteOne({ _id: id }).exec();
    },

    async countForTask(taskId) {
      await connect();
      return FileModel.countDocuments({ taskId }).exec();
    },
  };
}
