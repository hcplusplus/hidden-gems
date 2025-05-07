def debug_osm_query_advanced(bbox, tags=None, test_smaller_area=True):
    """
    Advanced debugging function for OpenStreetMap Overpass API queries.
    Tests multiple potential issues that could cause zero results.
    
    Parameters:
    -----------
    bbox: tuple
        Bounding box as (min_lat, min_lon, max_lat, max_lon).
    tags: dict, optional
        A dictionary of OSM tags to filter by (e.g., {"amenity": "restaurant"}).
    test_smaller_area: bool
        If True, also tests with a smaller area to check if the original area is too large.
        
    Returns:
    --------
    dict
        Detailed debugging information and suggestions.
    """
    import requests
    import time
    import json
    
    min_lat, min_lon, max_lat, max_lon = bbox
    debug_results = {
        "original_bbox": bbox,
        "original_tags": tags,
        "tests": {}
    }
    
    print("\n========= OVERPASS API DEBUGGING =========")
    print(f"Testing bbox: {min_lat}, {min_lon}, {max_lat}, {max_lon}")
    if tags:
        print(f"Tags: {tags}")
    
    # Test 1: Check if coordinates are valid
    print("\nTest 1: Validating coordinates...")
    if min_lat >= max_lat or min_lon >= max_lon:
        debug_results["tests"]["coordinate_validity"] = {
            "status": "error",
            "message": "Invalid bounding box: min values must be less than max values"
        }
        print("❌ Invalid bounding box: min values must be less than max values")
        return debug_results
    
    if abs(min_lat) > 90 or abs(max_lat) > 90 or abs(min_lon) > 180 or abs(max_lon) > 180:
        debug_results["tests"]["coordinate_validity"] = {
            "status": "error",
            "message": "Invalid coordinate values: outside allowed range"
        }
        print("❌ Invalid coordinate values: outside allowed range")
        return debug_results
    
    debug_results["tests"]["coordinate_validity"] = {
        "status": "pass",
        "message": "Coordinates are valid"
    }
    print("✅ Coordinates are valid")
    
    # Test 2: Check if the bounding box is too large
    print("\nTest 2: Checking bounding box size...")
    area = (max_lat - min_lat) * (max_lon - min_lon)
    debug_results["tests"]["bbox_size"] = {
        "area": area,
        "status": "info"
    }
    
    if area > 0.25:  # ~50km x 50km at the equator
        debug_results["tests"]["bbox_size"]["message"] = "Bounding box may be too large"
        print(f"⚠️ Bounding box area is {area:.6f}, which might be too large for a single query")
    else:
        debug_results["tests"]["bbox_size"]["message"] = "Bounding box size is reasonable"
        print(f"✅ Bounding box area is {area:.6f}, which is a reasonable size")
    
    # Test 3: Check Overpass API availability (simple status check)
    print("\nTest 3: Checking Overpass API availability...")
    overpass_url = "https://overpass-api.de/api/interpreter"
    try:
        status_query = "[out:json];out meta;"
        response = requests.post(overpass_url, data={'data': status_query}, timeout=5)
        response.raise_for_status()
        debug_results["tests"]["api_status"] = {
            "status": "pass",
            "message": "Overpass API is responding"
        }
        print("✅ Overpass API is responding")
    except Exception as e:
        debug_results["tests"]["api_status"] = {
            "status": "warning",
            "message": f"API check error: {str(e)}"
        }
        print(f"⚠️ API status check error: {e}")
        print("  This could indicate connectivity issues or server problems")
    
    # Test 4: Try a very simple node query without filters
    print("\nTest 4: Testing simple node query (no filters)...")
    try:
        simple_query = f"""
        [out:json][timeout:25];
        node({min_lat},{min_lon},{max_lat},{max_lon});
        out body;
        """
        
        response = requests.post(overpass_url, data={'data': simple_query}, timeout=30)
        if response.status_code != 200:
            debug_results["tests"]["simple_query"] = {
                "status": "error",
                "message": f"HTTP error: {response.status_code}, {response.text}"
            }
            print(f"❌ Simple query failed with HTTP error: {response.status_code}")
            print(f"  Response: {response.text[:200]}...")
        else:
            try:
                simple_data = response.json()
                element_count = len(simple_data.get('elements', []))
                debug_results["tests"]["simple_query"] = {
                    "status": "pass" if element_count > 0 else "warning",
                    "count": element_count,
                    "message": f"Simple node query returned {element_count} elements"
                }
                print(f"{'✅' if element_count > 0 else '⚠️'} Simple node query returned {element_count} elements")
                
                if element_count == 0:
                    print("  This suggests there may not be any OSM data in this area")
            except json.JSONDecodeError:
                debug_results["tests"]["simple_query"] = {
                    "status": "error",
                    "message": "Failed to parse JSON response"
                }
                print("❌ Failed to parse JSON response")
    except Exception as e:
        debug_results["tests"]["simple_query"] = {
            "status": "error",
            "message": str(e)
        }
        print(f"❌ Simple query error: {e}")
    
    # Test 5: If the original query returned no results, try with a smaller area
    if test_smaller_area and debug_results["tests"].get("simple_query", {}).get("count", 0) == 0:
        print("\nTest 5: Testing with a smaller area...")
        # Calculate center of the bounding box
        center_lat = (min_lat + max_lat) / 2
        center_lon = (min_lon + max_lon) / 2
        
        # Create a smaller bounding box (1/4 of the original area)
        smaller_min_lat = center_lat - (max_lat - min_lat) / 4
        smaller_max_lat = center_lat + (max_lat - min_lat) / 4
        smaller_min_lon = center_lon - (max_lon - min_lon) / 4
        smaller_max_lon = center_lon + (max_lon - min_lon) / 4
        
        smaller_bbox = (smaller_min_lat, smaller_min_lon, smaller_max_lat, smaller_max_lon)
        
        try:
            smaller_query = f"""
            [out:json][timeout:25];
            node({smaller_min_lat},{smaller_min_lon},{smaller_max_lat},{smaller_max_lon});
            out body;
            """
            
            response = requests.post(overpass_url, data={'data': smaller_query}, timeout=30)
            if response.status_code == 200:
                smaller_data = response.json()
                element_count = len(smaller_data.get('elements', []))
                debug_results["tests"]["smaller_area"] = {
                    "status": "pass" if element_count > 0 else "warning",
                    "count": element_count,
                    "smaller_bbox": smaller_bbox,
                    "message": f"Smaller area query returned {element_count} elements"
                }
                print(f"{'✅' if element_count > 0 else '⚠️'} Smaller area query returned {element_count} elements")
                
                if element_count > 0:
                    print("  This suggests the original area might be too large or at the boundary of OSM coverage")
                else:
                    print("  This confirms there may not be OSM data in this region")
            else:
                debug_results["tests"]["smaller_area"] = {
                    "status": "error",
                    "message": f"HTTP error: {response.status_code}"
                }
                print(f"❌ Smaller area query failed with HTTP error: {response.status_code}")
        except Exception as e:
            debug_results["tests"]["smaller_area"] = {
                "status": "error",
                "message": str(e)
            }
            print(f"❌ Smaller area query error: {e}")
    
    # Test 6: If tags are provided, test each tag separately
    if tags:
        print("\nTest 6: Testing each tag separately...")
        debug_results["tests"]["individual_tags"] = {}
        
        for key, value in tags.items():
            tag_name = f"{key}={value}" if value is not None else key
            print(f"  Testing tag: {tag_name}...")
            
            try:
                if value is None:
                    tag_filter = f'["{key}"]'
                else:
                    tag_filter = f'["{key}"="{value}"]'
                
                tag_query = f"""
                [out:json][timeout:25];
                (
                  node{tag_filter}({min_lat},{min_lon},{max_lat},{max_lon});
                  way{tag_filter}({min_lat},{min_lon},{max_lat},{max_lon});
                  relation{tag_filter}({min_lat},{min_lon},{max_lat},{max_lon});
                );
                out body;
                """
                
                response = requests.post(overpass_url, data={'data': tag_query}, timeout=30)
                if response.status_code == 200:
                    tag_data = response.json()
                    count = len(tag_data.get('elements', []))
                    debug_results["tests"]["individual_tags"][tag_name] = {
                        "status": "pass" if count > 0 else "warning",
                        "count": count,
                        "message": f"Tag {tag_name} returned {count} elements"
                    }
                    print(f"  {'✅' if count > 0 else '⚠️'} Tag {tag_name} returned {count} elements")
                else:
                    debug_results["tests"]["individual_tags"][tag_name] = {
                        "status": "error",
                        "message": f"HTTP error: {response.status_code}"
                    }
                    print(f"  ❌ Query for tag {tag_name} failed with HTTP error: {response.status_code}")
            except Exception as e:
                debug_results["tests"]["individual_tags"][tag_name] = {
                    "status": "error",
                    "message": str(e)
                }
                print(f"  ❌ Query error for tag {tag_name}: {e}")
            
            # Avoid overloading the API
            time.sleep(1)
    
    # Test 7: Try different server if previous tests failed
    if debug_results["tests"].get("simple_query", {}).get("status", "") != "pass":
        print("\nTest 7: Trying alternate Overpass API server...")
        alternate_url = "https://overpass.kumi.systems/api/interpreter"
        
        try:
            simple_query = f"""
            [out:json][timeout:25];
            node({min_lat},{min_lon},{max_lat},{max_lon});
            out body;
            """
            
            response = requests.post(alternate_url, data={'data': simple_query}, timeout=30)
            if response.status_code == 200:
                alt_data = response.json()
                element_count = len(alt_data.get('elements', []))
                debug_results["tests"]["alternate_server"] = {
                    "status": "pass" if element_count > 0 else "warning",
                    "count": element_count,
                    "server": alternate_url,
                    "message": f"Alternate server returned {element_count} elements"
                }
                print(f"{'✅' if element_count > 0 else '⚠️'} Alternate server returned {element_count} elements")
                
                if element_count > 0 and debug_results["tests"].get("simple_query", {}).get("count", 0) == 0:
                    print("  Primary server might be having issues. Try using the alternate server.")
            else:
                debug_results["tests"]["alternate_server"] = {
                    "status": "error",
                    "message": f"HTTP error: {response.status_code}"
                }
                print(f"❌ Alternate server query failed with HTTP error: {response.status_code}")
        except Exception as e:
            debug_results["tests"]["alternate_server"] = {
                "status": "error",
                "message": str(e)
            }
            print(f"❌ Alternate server query error: {e}")
    
    # Generate final assessment and recommendations
    print("\n========= ASSESSMENT =========")
    assessment = []
    recommendations = []
    
    # Check if there's OSM data in the area
    if debug_results["tests"].get("simple_query", {}).get("count", 0) == 0:
        if debug_results["tests"].get("smaller_area", {}).get("count", 0) > 0:
            assessment.append("The original area might be too large or at the boundary of OSM coverage")
            recommendations.append(f"Try using a smaller bounding box: {debug_results['tests']['smaller_area']['smaller_bbox']}")
        else:
            assessment.append("There appears to be no OSM data in this region")
            recommendations.append("Verify the coordinates and region are correct")
    
    # Check tag issues
    if tags and "individual_tags" in debug_results["tests"]:
        all_tags_zero = all(info.get("count", 0) == 0 for tag, info in debug_results["tests"]["individual_tags"].items())
        
        if all_tags_zero and debug_results["tests"].get("simple_query", {}).get("count", 0) > 0:
            assessment.append("The area has OSM data, but no elements match your tag filters")
            recommendations.append("Try different tags or check for typos")
        else:
            working_tags = [tag for tag, info in debug_results["tests"]["individual_tags"].items() if info.get("count", 0) > 0]
            if working_tags:
                assessment.append(f"Found data for these tags: {', '.join(working_tags)}")
                recommendations.append("Consider using only the tags that return results")
    
    # Check server issues
    if debug_results["tests"].get("alternate_server", {}).get("count", 0) > 0 and debug_results["tests"].get("simple_query", {}).get("count", 0) == 0:
        assessment.append("Primary Overpass server might be having issues")
        recommendations.append(f"Try using the alternate server: {debug_results['tests']['alternate_server']['server']}")
    
    # If no specific issues found
    if not assessment:
        if tags:
            assessment.append("The query appears valid, but no matching data was found")
            recommendations.append("Try removing some tag filters or expanding the search area")
        else:
            assessment.append("There appears to be a problem with the query or server")
            recommendations.append("Try a completely different area to verify server functionality")
    
    debug_results["assessment"] = assessment
    debug_results["recommendations"] = recommendations
    
    for item in assessment:
        print(f"• {item}")
    
    print("\n========= RECOMMENDATIONS =========")
    for item in recommendations:
        print(f"• {item}")
    
    return debug_results

# Example usage
if __name__ == "__main__":
    # Berkeley bounding box
    berkeley_bbox = (37.85, -122.27, 37.88, -122.22)
    
    # Test without tags first
    debug_results = debug_osm_query_advanced(berkeley_bbox)
    
    # Then test with tags if needed
    if debug_results["tests"].get("simple_query", {}).get("count", 0) > 0:
        tags = {'amenity': None, 'leisure': None}
        debug_osm_query_advanced(berkeley_bbox, tags)