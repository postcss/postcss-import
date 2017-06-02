/**
 * postcss-import
 * PostCSS plugin to import CSS files
 * @author    {Maxime Thirouin}
 * @copyright {MIT@2014-now}
 */
declare module "postcss-import" {
  // importing deps
  import * as postcss from 'postcss';

  // namespace
  namespace atImport {

    /**
     * @interface IAtImportArgs
     */
    interface IAtImportArgs {
      /**
       * An array of folder names to add to Node's resolver. 
       * Values will be appended to the default resolve directories: ["node_modules", "web_modules"]. 
       * This option is only for adding additional directories to default resolver. 
       * If you provide your own resolver via the resolve configuration option above, 
       * then this value will be ignored.
       * @example
       *  Example with some options

          import * as postcss from "postcss";
          import * as atImport from "postcss-import";

          postcss()
            .use(atImport({
              path: ["src/css"],
              transform: require("css-whitespace")
            }))
            .process(cssString)
            .then(function (result) {
              let css = result.css
            })
       * @type {string[]}
       * @memberOf IAtImportArgs
       */
      addModulesDirectories?: string[];
      /**
       * You can overwrite the default loading way by setting this option. 
       * This function gets (filename, importOptions) arguments and returns 
       * content or promised content.
       * @memberOf IAtImportArgs
       */
      load?: (filename: string, importOptios: IAtImportArgs) => any | Promise<any>;
      /**
       * Function called after the import process. 
       * Take one argument (array of imported files).
       * @memberOf IAtImportArgs
       */
      onImport?: (files: string[]) => void;
      /**
       * A string or an array of paths in where to look for files.
       * @type {(string | string[])}
       * @memberOf IAtImportArgs
       */
      path?: string | string[];
      /**
       * An array of plugins to be applied on each imported files.
       * @default {undefined}
       * @type {any[]}
       * @memberOf IAtImportArgs
       */
      plugins?: any[];
      /**
       * You can provide a custom path resolver with this option. 
       * This function gets (id, basedir, importOptions) arguments 
       * and should return a path, an array of paths or a 
       * promise resolving to the path(s). 
       * If you do not return an absolute path, your path will be 
       * resolved to an absolute path using the default resolver. 
       * You can use resolve for this.
       * @memberOf IAtImportArgs
       */
      resolve?: (id: string, basedir: string, importOptions: IAtImportArgs) => void;
      /**
       * Define the root where to resolve path (eg: place where node_modules are). Should not be used that much. 
       * Note: nested @import will additionally benefit of the relative dirname of imported files.
       * @default {process.cwd()}
       * @type {string}
       * @memberOf IAtImportArgs
       */
      root?: string;
      /**
       * By default, similar files (based on the same content) are being skipped. 
       * It's to optimize output and skip similar files like normalize.css for example. 
       * If this behavior is not what you want, just set this option to false to disable it.
       * @default {true}
       * @type {boolean}
       * @memberOf IAtImportArgs
       */
      skipDuplicates?: boolean;
    }
  }

  /**
   * plugin function
   * @param {atImport.IAtImportArgs} [args] 
   * @returns {*} 
   */
  function atImport(args?: atImport.IAtImportArgs): any;

  // defaulted export
  export = atImport;
}