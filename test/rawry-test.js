import { expect } from 'chai'
import _ from 'lodash'
import rawy from '../src/rawry'

describe('rawry', () => {
  let db

  before('create rawry instance', () => {
    const {
      MYSQL_HOST: host,
      MYSQL_USER: user,
      MYSQL_PASSWORD: password,
      MYSQL_DATABASE: database
    } = process.env

    db = rawy({ host, user, password, database })
  })

  beforeEach('create a test table', () => db.query`create table testDbTable (name varchar(255) not null)`)
  afterEach('drop test table', () => db.query`drop table testDbTable`)

  describe('querying', () => {
    beforeEach('insert a row', () => db.query`insert into testDbTable (name) values (${'David'})`)

    it('query should return a list of rows', async () => {
      const rows = await db.query`select * from testDbTable`

      expect(rows).to.be.a.instanceof(Array)
    })

    it('querySingle should return the first row directly', async () => {
      const { name } = await db.querySingle`select * from testDbTable`

      expect(name).to.eql('David')
    })
  })

  describe('transactions', () => {
    describe('when transaction function is successful', () => {
      beforeEach(() => db.transaction(async ({ query }) => {
        await query`insert into testDbTable (name) values (${'Bill'})`
      }))

      it('inserted the row', async () => {
        const { name } = await db.querySingle`select * from testDbTable`

        expect(name).to.eql('Bill')
      })
    })

    describe('when transaction function is throws an exception', () => {
      beforeEach(async () => {
        try {
          await db.transaction(async ({ query }) => {
            await query`insert into testDbTable (name) values (${'Bill'})`
            throw new Error('THIS WASNT VERY SUCCESSFUL WAS IT')
          })
        } catch (err) {
          // we're intentionally throwing an error so just swallow
          // we're interested in whether the insert prior to the error ends up in the db or not
        }
      })

      it('inserted the row', async () => {
        const { count } = await db.querySingle`select count(*) count from testDbTable`

        expect(count).to.eql(0)
      })
    })
  })

  describe('builder', () => {
    beforeEach(async () => {
      await db.transaction(async ({ builder }) => {
        let query = builder().append`insert into testDbTable (name) values`

        _.range(3).forEach((num, index) => {
          if (index !== 0) {
            query = query.append`,`
          }

          query = query.append`(${num})`
        })

        await query.run()
      })
    })

    it('should have inserted all items', async () => {
      const values = await db.query`select name from testDbTable`
      const names = _.map(values, 'name')

      expect(names).to.eql(['0', '1', '2'])
    })
  })
})
