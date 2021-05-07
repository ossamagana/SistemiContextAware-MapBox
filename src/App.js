import React, { useState, useRef, useEffect } from "react"
import useSwr from "swr"
import ReactMapGL, { Marker, FlyToInterpolator } from "react-map-gl"
import useSupercluster from "use-supercluster"
import "./App.css"
import axios from "axios"

const fetcher = url => axios.get(url).then(res => res.data)

const cities = {
    London: {
        lat: 51.5287718,
        lng: -0.2416787,
    },
    Leicester: {
        lat: 52.636124,
        lng: -1.1661194,
    },
    Birmingham: {
        lat: 52.4775215,
        lng: -1.9336704,
    },
    Manchester: {
        lat: 53.4723272,
        lng: -2.2935018,
    },
}

export default function App() {
    const [viewport, setViewport] = useState({
        latitude: 52.6376,
        longitude: -1.135171,
        width: "100vw",
        height: "100vh",
        zoom: 12,
    })
    const [citiesData, setCitiesData] = useState({})
    const mapRef = useRef()

    useEffect(() => {
        Object.entries(cities).forEach(([city, cityData]) => {
            const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${cityData.lat}&lng=${cityData.lng}&date=2021-01`
            fetcher(url).then(data => {
                const newCrimes = data ? data.slice(0, 2000) : []
                const newPoints = newCrimes.map(crime => ({
                    type: "Feature",
                    properties: { cluster: false, crimeId: crime.id, category: crime.category },
                    geometry: {
                        type: "Point",
                        coordinates: [parseFloat(crime.location.longitude), parseFloat(crime.location.latitude)],
                    },
                }))
                setCitiesData(prevState => ({ ...prevState, [city]: { crimes: newCrimes, points: newPoints } }))
            })
        })
    }, [])
    useEffect(() => {
        console.log(citiesData)
    }, [citiesData])

    const crimes = Object.entries(citiesData).reduce((acc, [city, cityData]) => {
        acc.push(...cityData.crimes)
        return acc
    }, [])

    const points = Object.entries(citiesData).reduce((acc, [city, cityData]) => {
        acc.push(...cityData.points)
        return acc
    }, [])

    const bounds = mapRef.current ? mapRef.current.getMap().getBounds().toArray().flat() : null

    const { clusters, supercluster } = useSupercluster({
        points,
        bounds,
        zoom: viewport.zoom,
        options: { radius: 75, maxZoom: 20 },
    })

    return (
        <div>
            <ReactMapGL
                {...viewport}
                maxZoom={20}
                mapboxApiAccessToken={
                    "pk.eyJ1Ijoib3NzYW1hZ2FuYSIsImEiOiJja29ibWp4NzQzMGkzMnBseWRzMml3amNwIn0.TjjLUnbesPl8NV4cbkNGKQ"
                }
                onViewportChange={newViewport => {
                    setViewport({ ...newViewport })
                }}
                ref={mapRef}
            >
                {clusters.map(cluster => {
                    const [longitude, latitude] = cluster.geometry.coordinates
                    const { cluster: isCluster, point_count: pointCount } = cluster.properties

                    if (isCluster) {
                        return (
                            <Marker key={`cluster-${cluster.id}`} latitude={latitude} longitude={longitude}>
                                <div
                                    className="cluster-marker"
                                    style={{
                                        width: `${10 + (pointCount / points.length) * 20}px`,
                                        height: `${10 + (pointCount / points.length) * 20}px`,
                                    }}
                                    onClick={() => {
                                        const expansionZoom = Math.min(
                                            supercluster.getClusterExpansionZoom(cluster.id),
                                            20
                                        )

                                        setViewport({
                                            ...viewport,
                                            latitude,
                                            longitude,
                                            zoom: expansionZoom,
                                            transitionInterpolator: new FlyToInterpolator({
                                                speed: 2,
                                            }),
                                            transitionDuration: "auto",
                                        })
                                    }}
                                >
                                    {pointCount}
                                </div>
                            </Marker>
                        )
                    }

                    return (
                        <Marker key={`crime-${cluster.properties.crimeId}`} latitude={latitude} longitude={longitude}>
                            <button className="crime-marker">
                                <img src="/custody.svg" alt="crime doesn't pay" />
                            </button>
                        </Marker>
                    )
                })}
            </ReactMapGL>
        </div>
    )
}
