@top Program { expression* }

@skip { space | LineComment }

expression {
  Identifier |
  String |
  Boolean |
  Application { "(" expression* ")" }
}

@tokens {
  Identifier { $[a-zA-Z_\-0-9]+ }

  String { '"' (!["\\] | "\\" _)* '"' }

  Boolean { "#t" | "#f" }

  LineComment { ";" ![\n]* }

  space { $[ \t\n\r]+ }

  "(" ")"
}

@detectDelim
