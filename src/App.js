import React, { useState, useRef, useEffect } from "react"
import ReactMapGL, { Marker, FlyToInterpolator } from "react-map-gl"
import useSupercluster from "use-supercluster"
import "./App.css"
import axios from "axios"
import mapboxgl from "mapbox-gl"
import { Div, Text } from "atomize"
import { motion } from "framer-motion"
import { IonImg } from "@ionic/react"
import { theme } from "./config"
// @ts-ignore
// eslint-disable-next-line import/no-webpack-loader-syntax, import/no-unresolved
mapboxgl.workerClass = require("worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker").default

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

const CrimeMarker = ({ latitude, longitude, setViewport }) => {
    return (
        <Marker latitude={latitude} longitude={longitude}>
            <motion.div whileTap={{ scale: 0.9 }}>
                <Div
                    w={"1.5rem"}
                    onClick={() => {
                        setViewport(prevState => ({
                            ...prevState,
                            latitude: latitude,
                            longitude: longitude,
                        }))
                    }}
                    m={"-1rem"}
                    transition
                >
                    <IonImg
                        src={require("./assets/jail.png")}
                        style={{
                            transition: "all 0.3s ease-in-out",
                        }}
                    />
                </Div>
            </motion.div>
        </Marker>
    )
}

const MarkerCluster = ({ latitude, longitude, pointCount, points, clusters, setViewport }) => {
    return (
        <Marker latitude={latitude} longitude={longitude}>
            <motion.div whileTap={{ scale: 0.9 }}>
                <Div
                    d="flex"
                    m="-1rem"
                    justify="center"
                    align="center"
                    w={`${25 + (pointCount / points?.length) * 40}px`}
                    h={`${25 + (pointCount / points?.length) * 40}px`}
                    rounded="circle"
                    bg={theme.colors.white}
                    border="2px solid"
                    borderColor={theme.colors.gunmetal}
                    onClick={() => {
                        const expansionZoom = Math.min(
                            clusters?.supercluster.getClusterExpansionZoom(clusters?.cluster.id),
                            20
                        )

                        setViewport(prevState => ({
                            ...prevState,
                            latitude,
                            longitude,
                            zoom: expansionZoom,
                            transitionInterpolator: new FlyToInterpolator({
                                speed: 2,
                            }),
                            transitionDuration: "auto",
                        }))
                    }}
                >
                    <Text textWeight="bold" textSize="subheader" textColor={theme.colors.gunmetal}>
                        {pointCount}
                    </Text>
                </Div>
            </motion.div>
        </Marker>
    )
}
export default function App() {
    const [viewport, setViewport] = useState({
        latitude: cities.London.lat,
        longitude: cities.London.lng,
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
                            <MarkerCluster
                                key={`cluster-${cluster.id}`}
                                latitude={latitude}
                                longitude={longitude}
                                pointCount={pointCount}
                                points={points}
                                clusters={{ cluster, supercluster }}
                                setViewport={setViewport}
                            />
                        )
                    }

                    return (
                        <CrimeMarker
                            key={`crime-${cluster.properties.crimeId}`}
                            latitude={latitude}
                            longitude={longitude}
                            setViewport={setViewport}
                        />
                    )
                })}
            </ReactMapGL>
        </div>
    )
}
