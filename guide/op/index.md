---
permalink: /guide/op/
title: "Operations"
---

## Arithmetic

<img class="block" src="{{page.permalink | append: 'arithmetic.png' | relative_url}}" alt="arithmetic block"/>

This block implements mathematical computations on two values.
It accepts numbers, column names, and nested operation blocks.

- *left space*: The left-hand side of the operation.
- *drop down*: Select addition, subtraction, multiplication, division, remainder, or exponentiation.
- *right space*: The right-hand side of the operation.

## Arithmetic Negation

<img class="block" src="{{page.permalink | append: 'negate.png' | relative_url}}" alt="negate block"/>

Negate a number.

- *space*: The value to negate.

## Logical Operations

<img class="block" src="{{page.permalink | append: 'logical_op.png' | relative_url}}" alt="logical operation block"/>

This block implements logical operations on two values.
It accepts any values on the left and right side
and produces either `true` or `false`.

- *left space*: The left-hand side of the operation.
- *drop down*: Select logical AND or logical OR.
- *right space*: The right-hand side of the operation.

Note that logical AND is only true if *both* sides are true,
while logical OR is true if *either or both* sides are true:
it is not either-or-both rather than one-or-the-other.

## Logical Negation

<img class="block" src="{{page.permalink | append: 'not.png' | relative_url}}" alt="not block"/>

Produce `true` if the value is `false` or `false` if the value is `true`.

- *space*: The value to invert.

## Type Checking

<img class="block" src="{{page.permalink | append: 'type_check.png' | relative_url}}" alt="type checking block"/>

Check if a value is of a particular type.

- *space*: The value to check.
- *drop down*: Select the type to convert for.

## Type Conversion

<img class="block" src="{{page.permalink | append: 'type_convert.png' | relative_url}}" alt="type conversion block"/>

Convert a value from one type to another.

- *space*: The value to convert.
- *drop down*: Select the type to convert to.

## Datetime Operations

<img class="block" src="{{page.permalink | append: 'datetime_op.png' | relative_url}}" alt="datetime operation block"/>

Extract the year, month, or day from a date/time value.

- *space*: The date/time value to convert.
- *drop down*: Select the sub-value to extract.

## Conditional

<img class="block" src="{{page.permalink | append: 'conditional.png' | relative_url}}" alt="conditional block"/>

Select one of two values based on a condition.
Any value can be used for the condition or for the results if the condition is true or false,
but the values used for the true and false cases must have the same type.

- *first space*: The condition to test.
- *second space*: The value if the condition is true.
- *third space*: The value if the condition is false.