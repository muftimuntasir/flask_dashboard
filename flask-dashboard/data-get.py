import requests
from bs4 import BeautifulSoup
import json
import csv

URL = "https://www.carsensor.net/shop/saitama/318127001/stocklist/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}


def main():
    print("Fetching page...")

    r = requests.get(URL, headers=headers)
    print("Status:", r.status_code)
    print(r.text[:1000])
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")

    # Get JSON data from the Next.js script
    script = soup.find("script", id="get_Cspec_data", type="application/json")
    if not script:
        print("ERROR: __NEXT_DATA__ NOT FOUND")
        return

    data = json.loads(script.string)

    # Car list location
    try:
        cars = data["props"]["pageProps"]["stockList"]
    except KeyError:
        print("ERROR: Car list not found in JSON.")
        return

    result = []
    for car in cars:
        name = car.get("carName")
        price = car.get("price")
        total = car.get("totalPrice")

        result.append([name, price, total])

    # Save CSV
    with open("carsensor_shop_318127001.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Car Name", "Price", "Total Price"])
        writer.writerows(result)

    print("Scraping completed!")
    print("Total Cars:", len(result))


if __name__ == "__main__":
    main()
