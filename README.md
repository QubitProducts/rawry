# Rawry

_Provides an API on top of [mysql](https://www.npmjs.com/package/mysql) designed for [Tagged Template Strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_template_literals) and async/await to make using raw SQL safe and lovely from modern ECMAScript._

## Usage

```js
import rawry from 'rawry'

const { transaction, query, querySingle } = rawry({ host: '', user: '', password: '', database: '' })

const name = 'Giles'
const anotherName = 'Ernest'

/**
 * Transactions are auto committed if the returned Promise resolves successfully.
 * Using async/await will do this behavior with normal flow control.
 **/
await transaction(async { query } => {
  await query`insert into people (name) values (${name})`
  await query`insert into people (name) values (${anotherName})`
})

// querySingle returns a single row
const longNameLength = 5
const { peopleCount } = await querySingle`select count(*) peopleCount from people where length(name)>${longNameLength}`

// query returns an array of row results
for (const { name } of await query`select name from people`) {
  console.log(name)
}
```

## What about SQL Injection!

So we're not using normal template strings.
We're instead using [Tagged Template Strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_template_literals) which give our `query` and `querySingle` functions a list of the strings and the values to splice into them.
Instead of building a single string we just call the `query` function of the mysql connection with placeholders and supply the values from your template string separately.

When you do ``query`select * from people where name = ${someValue}``, the `query` function in turn calls the `mysql` driver with `connection.query('select * from people where name = ?', [ someValue ])`.

Full details on the escaping in the `mysql` module can be found in it's [escaping query values](https://www.npmjs.com/package/mysql#escaping-query-values) section.

## Options

We directly pass through the options you supply `rawry` to the `mysql` connection. Find full details in their [Connection options](https://www.npmjs.com/package/mysql#connection-options).

## Want to work on this for your day job?

This project was created by the Engineering team at [Qubit](http://www.qubit.com). As we use open source libraries, we make our projects public where possible.

We’re currently looking to grow our team, so if you’re a JavaScript engineer and keen on ES2016 React+Redux applications and Node micro services, why not get in touch? Work with like minded engineers in an environment that has fantastic perks, including an annual ski trip, yoga, a competitive foosball league, and copious amounts of yogurt.

Find more details on our [Engineering site](https://eng.qubit.com). Don’t have an up to date CV? Just link us your Github profile! Better yet, send us a pull request that improves this project.`
