const Blockly = require('blockly/blockly_compressed')

Blockly.defineBlocksWithJsonArray([
  // Notify
  {
    type: 'combine_notify',
    message0: 'Notify %1',
    args0: [
      {
        type: 'field_input',
        name: 'NAME',
        text: 'name'
      }
    ],
    previousStatement: null,
    style: 'combine_block',
    tooltip: 'signal that a table is available',
    helpUrl: '',
    extensions: ['validate_NAME']
  }
])

// Notify
Blockly.TidyBlocks['combine_notify'] = (block) => {
  const name = block.getFieldValue('NAME')
  const code = `["@transform", "notify", "${name}"]`
  return code
}
