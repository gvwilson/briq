# TidyBlocks Revisited

Contributions of all kinds are welcome.
By offering a contribution, you agree to abide by our [Code of Conduct](CONDUCT.md)
and that your work may be made available under the terms of [our license](LICENSE.md).

1.  To report a bug or request a new feature,
    please check the [list of open issues](https://github.com/gvwilson/briq/issues)
    to see if it's already there,
    and if not,
    file as complete a description as you can.

1.  If you have made a fix or improvement,
    please create a [pull request](https://github.com/gvwilson/briq/pulls).
    We will review these as quickly as we can (typically within 2-3 days).

## Actions

-   `npm run build`: regenerate `tidyblocks.min.js`, then open `index.html` to see it.
    This is currently broken.

-   `npm run jeff`: regenerates `jeff.min.js` for testing, then open `jeff.html` to see it.
    Drag out a few blocks, then open the console and run `jeff.getCode()` to see the JSON for the blocks.

-   `npm run coverage`: run tests and report code coverage (open `coverage/index.html` to see results).

-   `npm run docs`: regenerate code documentation (open `docs/index.html` to view).

-   `npm run fixtures`: regenerate small programs for interactive testing.

-   `npm run lint`: run code style check.

-   `npm run test`: run tests without code coverage (which is faster).

## Organization

TidyBlocks uses Blockly for the user interface and Jekyll for the website as a whole.

### Source

-   `libs/util.js`: low-level utilities.

-   `libs/dataframe.js`: operations on data tables.

-   `libs/expr.js`, `libs/value.js`, and `libs.op.js`: things that can go in table rows.
    These may be nested (i.e., `add(multiply(2, column('red')), column('blue'))`

-   `libs/summarize.js`: summarization operations (such as `sum` and `max`).

-   `libs/transform.js`: operations on entire tables.
    These use expressions, summarizers, and statistical tests.

-   `libs/pipeline.js`: pipelines made up of stages.

-   `libs/program.js`: programs made up of pipelines.

-   `libs/json2obj.js`: convert serialized JSON to programs, pipelines, stages, and expressions.
    (These objects know how to convert themselves *to* JSON.)

-   `libs/environment.js`: the runtime environment for a program
    that stores datasets, records error messages, and so on.

-   `libs/ui.js` and `libs/browser.js`: handle interactions with the user.
    **FIXME: these two files should be combined into one.**

-   `blocks/*.js`: implementation of blocks.
    -   `blocks/codegen.js`: code generator.
    -   `blocks/util.js`: utilities.

### Other Files

-   `index.html`: user interface page.

-   `index.js`: gathers contents of `libs/*.js` for bundling to create `tidyblocks.min.js`.

-   `jeff.html`: testing interface page.

-   `jeff.js`: gathers blocks for bundling to create `jeff.min.js` for testing.

-   `test/test_*.js`: unit tests.

-   `static/ui.css`: CSS for the user interface.

-   `_config.yml`: Jekyll configuration file.

-   `_data/*`, `_includes/*`, and `_layouts/*`: Jekyll site generation files.

-   `coverage/*`: code coverage data generated by `npm run coverage`.

-   `data/*`: built-in datasets.

-   `docs/*`: JSDoc code documentation generated by `npm run docs`.

-   `fixtures/*`: small programs to load for interactive testing.
    Regenerate using `npm run fixtures` after any change to JSON serialization.

-   `guide/*`: source for user guide (written with Jekyll).
    **FIXME: incomplete.**

## How It Works

This section describes the implementation in `jeff.html` and `jeff.js`,
which replaces the half-finished one in `index.html` and `index.js`
and draws on the prototype in <https://github.com/gvwilson/tidyblocks/>
(which is online at <http://tidyblocks.tech>).

-   On launch, `jeff.html` loads `jeff.min.js` with the namespace `jeff`
    and then calls `jeff.setup`.

-   As `jeff.min.js` is loaded,
    the code in `jeff.js` loads `blocks/*.js`
    to register blocks with Blockly.
    When `setup` is called,
    it creates input validators for those blocks
    (e.g., to check that user-defined column names match regular expressions),
    then creates the Blockly workspace.

-   Each file in `blocks/*.js` uses `Blockly.defineBlocksWithJsonArray`
    to define the appearance of a group of blocks
    and then creates a code generation function for each of those blocks.
    Blockly requires code generators to return strings,
    so the code generation functions return stringified JSON rather than JSON objects.

    -   *This JSON must match the JSON produced by the `.toJSON` methods in `libs/*.js`;
        a future cleanup would be to unify these somehow to remove the duplication.*

-   The user can now drag blocks out to build a program.
    Only those blocks listed in the `xml` element with the ID `toolbox` in `jeff.html` are visible.

-   The function `getCode` (`jeff.js`) builds a JSON representation of the current program.
    (This has to be run in the JavaScript console right now, but will be connected to a button in the UI.)
    It relies on `Blockly.TidyBlocks.workspaceToCode` (`blocks/codegen.js`):
    1.  Get the top block of each stack in the workspace.
    2.  Ignore any that aren't hat blocks (i.e., top-of-stack blocks).
    3.  Build a list of the top-level blocks in this stack.
    4.  Ask each to generate its stringified JSON.
        -   If the result of `Blockly.TidyBlocks.blockToCode` is an array,
            the first element contains the JSON
            and the second contains a precedence indicator,
            so extract the first part.
    5.  Put the JSON for the pipeline's stages into a list
        and insert the prefix `"@pipeline"` at the start.
    6.  Put the pipelines in a list
        and insert the prefix `"@program"` at the start.

-   This algorithm ensures that if a stack *doesn't* start with a hat block,
    its pipeline *isn't* included in the program.
    However,
    pipelines might still contain holes,
    e.g.,
    there might be a `filter` block that doesn't yet have a filter expression
    or an `add` operation that is missing one or both operands.
    The code generator inserts the JSON `["@value", "absent"]` to mark these places.
    When the program runs, these blocks raise errors.

    -   *The UI should flag absent values and refuse to run pipelines containing them
        rather than running and raising errors.*

-   The function `getProgram` (`jeff.js`) gets the stringified representation of the program,
    then creates an instance of `JsonToObj` (`libs/json2obj.js`)
    and passes the JSON to its `.program` method
    to convert the JSON to runnable objects.

    -   *`JsonToObject` assumes a program-to-pipeline-to-expression structure.
        If TidyBlocks ever acquires C-blocks or other structures,
        this function will need to be revisited.*

-   The runnable representation of the program is build using instances of:
    -   `Program` (`libs/program.js`)
    -   `Pipeline` (`libs/pipeline.js`)
    -   Subclasses of `TransformBase` (`libs/transform.js`)
    -   Subclasses of `ExprBase` (`libs/operation.js` and `libs/value.js`)

-   `Program` keeps track of all its `Pipeline` objects in two member variables:
    -   `queue` stores the pipelines that are ready to run.
    -   `waiting` stores the pipelines that are waiting for the results of other pipelines.
    The execution algorithm is:
    -   A pipeline that starts with a data-reading block goes straight into `queue`.
    -   A pipeline that starts with a `join` block goes into `waiting`.
    -   Whenever a pipeline that ends in a `notify` block finishes,
        the program checks all of the pipelines in `waiting`.
        If any of them now have all of their dependencies satisfied,
        they are moved to `queue` for execution.
    -   When there is nothing left in `queue`,
        the program stops.
    *The program should notify users of pipelines that didn't run
    because their dependencies were never satisfied.*

-   To run, the program requires an `Environment` object (`libs/environment.js`).
    This object stores programs' output,
    such as the plots, data tables, and error messages that pipelines produce.
    -   `Environment`'s constructor requires a `readData` function.
        In the browser, this reads an external file using `XMLHttpRequest`.
        The tests in `test/*.js` provide a function that reads directly from disk instead.

-   Programs create and manipulate `DataFrame` objects (`libs/dataframe.js`).
    A dataframe stores zero or more rows in the `.data` member variable.
    Each row is an object whose keys must match the column names stored in the `.columns` member variable.
    -   The dataframe stores the column names in `.columns` so that
        if an operation results in zero rows,
        the dataframe can still be displayed sensibly.
    All of the values for a particular key must be of the same type,
    e.g.,
    they must all be numbers or dates.
    -   The special value `util.MISSING` represents missing data.
        All operations handle this value,
        e.g.,
        `add` of `MISSING` and 3 is `MISSING`.

-   The sub-classes of `SummarizeBase` (`libs/summarize.js`) implement summarization operations
    such as averaging.
    These objects are used by the `TransformSummarize` block (`libs/transform.js`).
