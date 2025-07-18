# Setup

1. `cp .env.sample .env` and fill in the API key which was given to you.
2. Install dependencies
3. Run configurations can be found `.vscode/launch.json` or `.run`.

# Goal

We would like you to restore functionality to `/comparator-map`, this endpoint should return a Google Maps image which
contains 4 markers. 1 indicating the location of the valuation object (indicated with a little house icon) and the three
selected references (indicated 1 to 3), the background color of the markers should be configurable. For comparable
references the background color should be `#95E8D4`, other references should be `#F3705A`.

There's a `dummy.json` inside `src` to help you along.

Once that is done, restore functionality to `/comparator-pdf`, this endpoint should return a PDF file which embeds the
aforementioned map image with a listing of the selected reference in the following format.

```
1. $street $houseNumber$houseLetter-$houseNumberAddition
$zipCode - $city
```

The font should be `Helvetica`, the first line should be `16px`, the remaining `12px` and each item should be listed in
two columns side-by-side.

# Tips

- There's a `develop:recompile` launch configuration, speeding up the build step, the configuration `develop:clean-build`
    will clean the build directory first.
- .ejs files are automatically hot reloaded.
