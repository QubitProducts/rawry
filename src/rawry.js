import mysql from 'mysql'
import nodefn from 'when/node'

export default function create (options) {
  const pool = mysql.createPool(options)

  return {
    query,
    querySingle,
    transaction,
    close
  }

  async function query (strings, ...args) {
    return await withConnection(async ({ connection }) => {
      return await queryConnection(connection)(strings, ...args)
    })
  }

  /**
   * Identical to query but only returns the first row of the result set.
   * Useful for things like `select count(*)` which only returns a scalar.
   **/
  async function querySingle (strings, ...args) {
    return await withConnection(async ({ connection }) => {
      return await queryConnectionSingle(connection)(strings, ...args)
    })
  }

  /**
   * Like withConnection but auto begins and commits transactions
   * if no errors are thrown.
   **/
  async function transaction (fn) {
    await withConnection(async connection => {
      let finished = false

      await connection.beginTransaction()

      try {
        await fn(Object.assign({}, connection, {
          commit, rollback
        }))

        // auto-commit if consumer hasn't done it
        if (!finished) {
          await commit()
        }
      } catch (err) {
        if (!finished) {
          await rollback()
        }

        throw err
      }

      async function commit () {
        finished = true
        await connection.commit()
      }

      async function rollback () {
        finished = true
        await connection.rollback()
      }
    })
  }

  async function close () {
    return await nodefn.call(::pool.end)
  }

  async function getConnection () {
    return await nodefn.call(::pool.getConnection)
  }

  async function withConnection (fn) {
    const connection = await getConnection()

    try {
      return await fn(wrapConnection(connection))
    } finally {
      connection.release()
    }
  }

  function queryConnection (connection) {
    return async (strings, ...args) => {
      /**
       * Tagged template strings call this function with an array of strings
       * which surround the values to be interpolated. E.g. so the statement:
       *  query`insert into testTable (name) values (${name})`
       * will call this function with (['insert into testTable (name) values (', ')'], name).
       * To build the actual sql we just join with the placeholder character (?) and
       * give the actual values to interpolate to the query method.
       * More details: https://github.com/felixge/node-mysql#escaping-query-values
       **/
      const sql = strings.join('?')

      const [ rows ] = await nodefn.call(::connection.query, sql, args)

      return rows
    }
  }

  function queryConnectionSingle (connection) {
    return async (strings, ...args) => {
      const [ first ] = await queryConnection(connection)(strings, ...args)

      return first
    }
  }

  function builderConnection (connection) {
    return function builder (strings = [], ...items) {
      return {
        append,
        run
      }

      function append (newStrings, ...newItems) {
        // we want to merge the last of the old array with the head of new array
        const mergedStrings = strings.slice(0, -1)
          .concat((strings[strings.length - 1] || '') + newStrings[0])
          .concat(newStrings.slice(1))

        return builder(mergedStrings, ...items.concat(newItems))
      }

      function run () {
        return queryConnection(connection)(strings, ...items)
      }
    }
  }

  /**
   * Wrap mysql connection in a Promise friendly api
   **/
  function wrapConnection (connection) {
    return {
      connection,
      builder: builderConnection(connection),
      query: queryConnection(connection),
      querySingle: queryConnectionSingle(connection),
      beginTransaction: nodefn.lift(::connection.beginTransaction),
      commit: nodefn.lift(::connection.commit),
      rollback: nodefn.lift(::connection.rollback)
    }
  }
}
