# Gap Filling Scripts
# Run these AFTER the seed scripts and running_days scraper.
# Each script fills missing fields in RailwayData collections
# using data that's already available in the database.

# Usage:
#   cd Railway_data
#   cd filling_gaps
#   python fill_num_cars.py
#   python fill_ac_type.py
#   python fill_speed_type.py
#   python fill_station_names.py

# Prerequisite: pip install pymongo
