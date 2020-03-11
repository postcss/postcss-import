import { AcceptedPlugin, Transformer } from "postcss";

interface AtImportOptions {
  /**
   * Define the root where to resolve path (eg: place where `node_modules` are). Should not be used
   * that much.
   *
   * _Note: nested @import will additionally benefit of the relative dirname of imported files._
   *
   * Default: `process.cwd()` or dirname of [the postcss from](https://github.com/postcss/postcss#node-source)
   */
  root?: string;

  /**
   * A string or an array of paths in where to look for files.
   */
  path?: string | string[];

  /**
   * An array of plugins to be applied on each imported files.
   */
  plugins?: AcceptedPlugin[];

  /**
   * You can provide a custom path resolver with this option. This function gets
   * `(id, basedir, importOptions)` arguments and should return a path, an array of paths or a
   * promise resolving to the path(s). If you do not return an absolute path, your path will be
   * resolved to an absolute path using the default resolver. You can use
   * [resolve](https://github.com/substack/node-resolve) for this.
   */
  resolve?: (
    is: string,
    basedir: string,
    importOptions: AtImportOptions
  ) => string;

  /**
   * You can overwrite the default loading way by setting this option. This function gets
   * `(filename, importOptions)` arguments and returns content or promised content.
   */
  load?: (filename: string, importOptions: AtImportOptions) => string;

  /**
   * By default, similar files (based on the same content) are being skipped. It's to optimize
   * output and skip similar files like `normalize.css` for example. If this behavior is not what
   * you want, just set this option to false to disable it.
   *
   * @default true
   */
  skipDuplicates?: boolean;

  /**
   * An array of folder names to add to Node's resolver. Values will be appended to the default
   * resolve directories: `["node_modules", "web_modules"]`.
   *
   * This option is only for adding additional directories to default resolver. If you provide your
   * own resolver via the `resolve` configuration option above, then this value will be ignored.
   */
  addModulesDirectories?: string[];
}

declare function atImport(options: AtImportOptions): Transformer;

export = atImport;
